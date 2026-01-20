import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Sword, Shield, Sparkles, Flame, Zap, Star, Layers, 
  ChevronRight, User, Snowflake, Skull, RefreshCw, Box, Copy,
  ZapOff, Crosshair, Droplets, Wind, Eye, Ghost
} from 'lucide-react';

// --- Types ---
type CardType = 'ATTACK' | 'DEFEND' | 'SKILL';
// Expanded visual effect types for more variety
type VisualEffectType = 'SLASH' | 'BLOCK' | 'HEAL' | 'BUFF_AURA' | 'EXPLOSION' | 'ICE_NOVA' | 'THUNDER' | 'DRAW' | 'LASER' | 'VOID' | 'DRAIN' | 'SPIN_SLASH' | 'SHUFFLE' | 'CRIT_BUFF' | 'EVASION_BUFF';
type UpgradePathType = 'POWER' | 'SPEED' | 'SPECIAL';
type GameScreen = 'MENU' | 'BATTLE' | 'DECK' | 'GACHA' | 'REWARD' | 'VICTORY' | 'DEFEAT';
type FloatingTextType = 'DAMAGE' | 'HEAL' | 'SHIELD' | 'BUFF';

interface UpgradeOption {
  name: string;
  description: string;
  valueMod: number;
  costMod: number;
}

interface Card {
  uid: string;
  id: string;
  type: CardType;
  baseName: string;
  baseDesc: string;
  baseCost: number;
  baseValue: number;
  baseFx: VisualEffectType;
  color: string;
  level: number;
  currentPath: UpgradePathType | null;
  upgradeOptions: {
    [key in UpgradePathType]?: UpgradeOption;
  };
}

interface Character {
  id: string;
  name: string;
  desc: string;
  avatarColor: string;
  rarity: 'R' | 'SR' | 'SSR';
}

interface VisualEffect {
  id: number;
  type: VisualEffectType;
  target: 'PLAYER' | 'ENEMY';
}

interface FloatingText {
  id: number;
  value: string | number;
  target: 'PLAYER' | 'ENEMY';
  type: FloatingTextType;
  isCrit?: boolean;
}

interface Buffs {
    crit: number;
    evasion: number;
}

// --- Constants ---
const INITIAL_PLAYER_HP = 100;
const INITIAL_ENEMY_HP = 200;
const STARTING_ENERGY = 3;
const MAX_DECK_SIZE = 30; // Max cards in battle deck

const TYPE_MAP: Record<CardType, string> = {
  ATTACK: '攻击',
  DEFEND: '防御',
  SKILL: '技能'
};

const CARD_TEMPLATES: Omit<Card, 'uid' | 'level' | 'currentPath'>[] = [
  {
    id: 'c1', type: 'ATTACK', baseName: '星光斩', baseDesc: '造成 {val} 点伤害', 
    baseCost: 1, baseValue: 8, baseFx: 'SLASH', color: '#ef4444',
    upgradeOptions: {
      POWER: { name: '重斩', description: '伤害大幅提升', valueMod: 5, costMod: 0 },
      SPEED: { name: '光速斩', description: '费用降低', valueMod: -2, costMod: -1 },
      SPECIAL: { name: '双星连斩', description: '造成2次伤害', valueMod: 0, costMod: 1 }
    }
  },
  {
    id: 'c2', type: 'DEFEND', baseName: '相位盾', baseDesc: '获得 {val} 点护盾', 
    baseCost: 1, baseValue: 7, baseFx: 'BLOCK', color: '#3b82f6',
    upgradeOptions: {
      POWER: { name: '力场盾', description: '护盾值提升', valueMod: 5, costMod: 0 },
      SPEED: { name: '轻型盾', description: '0费启动', valueMod: -2, costMod: -1 },
      SPECIAL: { name: '绝对零度', description: '获得护盾并冻结敌人', valueMod: 0, costMod: 1 }
    }
  },
  {
    id: 'c3', type: 'ATTACK', baseName: '雷击', baseDesc: '造成 {val} 点伤害', 
    baseCost: 2, baseValue: 14, baseFx: 'THUNDER', color: '#a855f7',
    upgradeOptions: {
      POWER: { name: '雷暴', description: '伤害极大提升', valueMod: 8, costMod: 0 },
      SPEED: { name: '瞬雷', description: '费用降低', valueMod: 0, costMod: -1 },
      SPECIAL: { name: '贯穿雷枪', description: '无视护盾造成伤害', valueMod: 0, costMod: 0 }
    }
  },
  {
    id: 'c4', type: 'SKILL', baseName: '能量超载', baseDesc: '获得 1 点能量', 
    baseCost: 0, baseValue: 1, baseFx: 'BUFF_AURA', color: '#eab308',
    upgradeOptions: {
      POWER: { name: '极限超载', description: '获得3点能量，但消耗生命', valueMod: 2, costMod: 0 },
      SPEED: { name: '稳定充能', description: '获得2点能量', valueMod: 1, costMod: 0 },
      SPECIAL: { name: '生命转化', description: '获得能量并恢复生命', valueMod: 5, costMod: 0 }
    }
  },
  {
    id: 'c5', type: 'ATTACK', baseName: '聚变打击', baseDesc: '造成 {val} 点伤害', 
    baseCost: 3, baseValue: 25, baseFx: 'EXPLOSION', color: '#f43f5e',
    upgradeOptions: {
      POWER: { name: '核爆', description: '伤害提升', valueMod: 10, costMod: 0 },
      SPEED: { name: '快速反应', description: '费用 -1', valueMod: 0, costMod: -1 },
      SPECIAL: { name: '斩杀', description: '敌人生命<30%时直接消灭', valueMod: 0, costMod: 0 }
    }
  },
  {
    id: 'c6', type: 'ATTACK', baseName: '回旋刃', baseDesc: '造成 {val} 点伤害',
    baseCost: 1, baseValue: 6, baseFx: 'SPIN_SLASH', color: '#ec4899',
    upgradeOptions: {
        POWER: { name: '重刃', description: '伤害 +4', valueMod: 4, costMod: 0 },
        SPEED: { name: '极速', description: '0费', valueMod: -1, costMod: -1 },
        SPECIAL: { name: '双重回旋', description: '触发两次', valueMod: 0, costMod: 1 }
    }
  },
  {
      id: 'c7', type: 'ATTACK', baseName: '吸血之触', baseDesc: '造成 {val} 伤害并回血',
      baseCost: 2, baseValue: 8, baseFx: 'DRAIN', color: '#be123c',
      upgradeOptions: {
          POWER: { name: '鲜血盛宴', description: '伤害 +5', valueMod: 5, costMod: 0 },
          SPEED: { name: '迅捷吸血', description: '费用 -1', valueMod: -2, costMod: -1 },
          SPECIAL: { name: '生命虹吸', description: '恢复量翻倍', valueMod: 0, costMod: 0 }
      }
  },
  {
      id: 'c9', type: 'ATTACK', baseName: '光束炮', baseDesc: '造成 {val} 点伤害',
      baseCost: 2, baseValue: 12, baseFx: 'LASER', color: '#3b82f6',
      upgradeOptions: {
          POWER: { name: '高能炮', description: '伤害 +8', valueMod: 8, costMod: 0 },
          SPEED: { name: '连发模式', description: '费用 -1', valueMod: -2, costMod: -1 },
          SPECIAL: { name: '穿透光束', description: '无视护盾', valueMod: 0, costMod: 0 }
      }
  },
  {
      id: 'c10', type: 'SKILL', baseName: '禁忌契约', baseDesc: '消耗生命换取能量',
      baseCost: 0, baseValue: 0, baseFx: 'VOID', color: '#7f1d1d',
      upgradeOptions: {
          POWER: { name: '恶魔契约', description: '消耗更多生命，获得3能量', valueMod: 0, costMod: 0 },
          SPEED: { name: '轻量契约', description: '消耗少量生命，获得1能量', valueMod: 0, costMod: 0 },
          SPECIAL: { name: '等价交换', description: '消耗10生命，获得2能量', valueMod: 0, costMod: 0 }
      }
  },
  {
      id: 'c11', type: 'SKILL', baseName: '战术补给', baseDesc: '抽 2 张牌',
      baseCost: 0, baseValue: 2, baseFx: 'DRAW', color: '#10b981',
      upgradeOptions: {
          POWER: { name: '大量补给', description: '抽 3 张牌，费用+1', valueMod: 1, costMod: 1 },
          SPEED: { name: '快速补给', description: '抽 2 张牌', valueMod: 0, costMod: 0 },
          SPECIAL: { name: '能量补给', description: '抽1牌并获得1能量', valueMod: -1, costMod: 0 }
      }
  },
  {
      id: 'c12', type: 'SKILL', baseName: '紧急扩容', baseDesc: '抽 3 张牌',
      baseCost: 1, baseValue: 3, baseFx: 'DRAW', color: '#059669',
      upgradeOptions: {
          POWER: { name: '极限扩容', description: '抽 5 张牌', valueMod: 2, costMod: 1 },
          SPEED: { name: '便携扩容', description: '0费，抽 2 张', valueMod: -1, costMod: -1 },
          SPECIAL: { name: '回收', description: '从弃牌堆随机拿回一张牌', valueMod: 0, costMod: 0 }
      }
  },
  {
      id: 'c13', type: 'SKILL', baseName: '全息瞄准', baseDesc: '下一次攻击造成双倍伤害',
      baseCost: 1, baseValue: 1, baseFx: 'CRIT_BUFF', color: '#f59e0b',
      upgradeOptions: {
          POWER: { name: '精密锁定', description: '获得 2 层暴击', valueMod: 1, costMod: 1 },
          SPEED: { name: '快速锁定', description: '0费', valueMod: 0, costMod: -1 },
          SPECIAL: { name: '弱点分析', description: '暴击并抽1张牌', valueMod: 0, costMod: 0 }
      }
  },
  {
      id: 'c14', type: 'SKILL', baseName: '幽灵漫步', baseDesc: '闪避下一次攻击',
      baseCost: 1, baseValue: 1, baseFx: 'EVASION_BUFF', color: '#6366f1',
      upgradeOptions: {
          POWER: { name: '虚空行走', description: '获得 2 层闪避', valueMod: 1, costMod: 1 },
          SPEED: { name: '瞬步', description: '0费', valueMod: 0, costMod: -1 },
          SPECIAL: { name: '残影', description: '闪避并对敌人造成5点反击伤害', valueMod: 0, costMod: 0 }
      }
  }
];

const CHARACTERS: Character[] = [
  { id: 'ch1', name: '蕾娜', desc: '星际雇佣兵', avatarColor: '#f87171', rarity: 'R' },
  { id: 'ch2', name: '凯尔', desc: '虚空行者', avatarColor: '#818cf8', rarity: 'SR' },
  { id: 'ch3', name: '伊莉丝', desc: '银河歌姬', avatarColor: '#f472b6', rarity: 'SSR' },
];

// --- Helpers ---
const createCard = (template: Omit<Card, 'uid' | 'level' | 'currentPath'>): Card => {
  return {
    ...template,
    uid: Math.random().toString(36).substr(2, 9),
    level: 1,
    currentPath: null,
  };
};

const getCardStats = (card: Card) => {
  let val = card.baseValue;
  let cost = card.baseCost;
  let name = card.baseName;
  let desc = card.baseDesc;
  let fx = card.baseFx;

  if (card.currentPath && card.upgradeOptions[card.currentPath]) {
    const upgrade = card.upgradeOptions[card.currentPath]!;
    val += upgrade.valueMod;
    cost = Math.max(0, cost + upgrade.costMod); // Prevent negative cost
    name = upgrade.name;
  }
  
  // Replace placeholders
  desc = desc.replace('{val}', val.toString());

  return { val, cost, name, desc, fx, longDesc: desc + (card.currentPath ? ` (${card.upgradeOptions[card.currentPath]?.description})` : '') };
};

// --- Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false }: any) => {
  const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30",
    secondary: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30",
    outline: "border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  showUpgrade?: boolean;
  onHover?: (card: Card | null, rect: DOMRect | null) => void;
  isPlaying?: boolean; 
}

const CardComponent: React.FC<CardComponentProps> = ({ card, onClick, disabled, showUpgrade, onHover, isPlaying }) => {
  const { val, cost, fx, desc, name } = getCardStats(card);
  
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlaying && onHover) {
       const rect = e.currentTarget.getBoundingClientRect();
       onHover(card, rect);
    }
  };

  return (
    <div 
      className={`relative group shrink-0 transition-all duration-500 ${isPlaying ? 'z-[100] pointer-events-none' : 'hover:z-50 animate-deal'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => !isPlaying && onHover && onHover(null, null)}
    >
        {/* Card Body - Animated Part */}
        <div 
        onClick={() => !disabled && !isPlaying && onClick && onClick()}
        className={`
            relative w-32 h-48 rounded-xl p-3 flex flex-col justify-between transition-all duration-300 transform border-2 will-change-transform
            ${isPlaying ? 'animate-card-play' : 
              disabled ? 'opacity-50 grayscale cursor-not-allowed scale-95' : 'hover:-translate-y-4 hover:shadow-2xl hover:shadow-pink-500/40 cursor-pointer hover:scale-105'}
            ${card.currentPath === 'POWER' ? 'bg-red-900/40' : card.currentPath === 'SPEED' ? 'bg-blue-900/40' : card.currentPath === 'SPECIAL' ? 'bg-yellow-900/40' : 'bg-gray-900'}
        `}
        style={{ borderColor: card.color }}
        >
        <div className="text-xs font-bold text-gray-300 flex justify-between">
            <span className={cost < card.baseCost ? "text-green-400" : ""}>{cost} ⚡</span>
            <span style={{ color: card.color }}>{TYPE_MAP[card.type]}</span>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
            {card.type === 'ATTACK' && <Sword size={32} style={{ color: card.color }} />}
            {card.type === 'DEFEND' && <Shield size={32} style={{ color: card.color }} />}
            {card.type === 'SKILL' && <Sparkles size={32} style={{ color: card.color }} />}
            
            {/* Stat Badge */}
            {(card.type === 'ATTACK' || card.type === 'DEFEND') && (
                <div className={`absolute -bottom-2 ${card.type === 'ATTACK' ? 'bg-red-900/90 border-red-500' : 'bg-blue-900/90 border-blue-500'} border text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10 animate-fade-in`}>
                  {card.type === 'ATTACK' ? <Sword size={10} /> : <Shield size={10} />}
                  <span>{val}</span>
                </div>
            )}
            {/* Draw Badge */}
            {fx === 'DRAW' && (
                 <div className="absolute -bottom-2 bg-green-900/90 border-green-500 border text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10 animate-fade-in">
                    <Copy size={10} />
                    <span>+{val}</span>
                 </div>
            )}
            
            {/* Buff Badges */}
            {fx === 'CRIT_BUFF' && (
                 <div className="absolute -bottom-2 bg-yellow-900/90 border-yellow-500 border text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10 animate-fade-in">
                    <Crosshair size={10} />
                    <span>+{val}</span>
                 </div>
            )}
            {fx === 'EVASION_BUFF' && (
                 <div className="absolute -bottom-2 bg-indigo-900/90 border-indigo-500 border text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10 animate-fade-in">
                    <Wind size={10} />
                    <span>+{val}</span>
                 </div>
            )}

            {/* Upgrade Icon Overlay */}
            {card.currentPath && (
            <div className="absolute -bottom-6 -right-2 bg-black/80 rounded-full p-1 border border-white/20 z-10">
                {card.currentPath === 'POWER' && <Flame size={12} className="text-red-500"/>}
                {card.currentPath === 'SPEED' && <Zap size={12} className="text-blue-500"/>}
                {card.currentPath === 'SPECIAL' && <Star size={12} className="text-yellow-500"/>}
            </div>
            )}
        </div>
        <div className="text-center mt-2">
            <div className={`font-bold text-sm text-white mb-1 ${card.currentPath ? 'text-yellow-200' : ''}`}>{name}</div>
            <div className="text-[10px] text-gray-400 leading-tight line-clamp-2">{desc}</div>
        </div>
        </div>
    </div>
  );
};

const CharacterCard = ({ char }: { char: Character }) => (
  <div className="w-48 h-72 bg-gray-800 rounded-xl overflow-hidden border border-gray-600 relative group hover:scale-105 transition-transform">
    <div className="h-48 bg-gray-700 flex items-center justify-center" style={{ backgroundColor: char.avatarColor }}>
       <User size={64} className="text-white/50" />
    </div>
    <div className="p-3">
       <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-white">{char.name}</span>
          <span className={`text-xs font-bold px-1.5 rounded ${char.rarity === 'SSR' ? 'bg-yellow-500 text-black' : char.rarity === 'SR' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>{char.rarity}</span>
       </div>
       <div className="text-xs text-gray-400">{char.desc}</div>
    </div>
  </div>
);

const EffectLayer: React.FC<{ effects: VisualEffect[] }> = ({ effects }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible">
      {effects.map(effect => {
        let animationClass = '';
        let content = null;
        
        switch(effect.type) {
            case 'SHUFFLE':
                animationClass = 'animate-fade-out';
                content = (
                  <div className="flex flex-col items-center gap-2 z-50">
                    <div className="w-24 h-24 rounded-full border-4 border-emerald-400 border-dashed flex items-center justify-center animate-spin-slow bg-black/50 backdrop-blur">
                        <RefreshCw size={48} className="text-emerald-400" />
                    </div>
                    <div className="text-emerald-400 font-bold text-xl tracking-widest animate-pulse">RESHUFFLING</div>
                  </div>
                );
                break;
            case 'SLASH': 
                animationClass = 'animate-slash-combo';
                content = (
                    <div className="relative w-full h-full flex items-center justify-center z-50">
                       {/* Primary White Slash */}
                       <div className="absolute w-[120%] h-2 bg-white shadow-[0_0_50px_white] rotate-[-30deg] animate-slash-core origin-center mix-blend-overlay"></div>
                       {/* Secondary Color Slash */}
                       <div className="absolute w-[120%] h-32 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rotate-[-30deg] opacity-0 animate-slash-trail mix-blend-screen"></div>
                       {/* Impact Distortion */}
                       <div className="absolute w-full h-full bg-cyan-400/10 mix-blend-color-dodge animate-flash-impact pointer-events-none"></div>
                    </div>
                );
                break;
            case 'SPIN_SLASH':
                animationClass = 'animate-spin-slash';
                content = (
                    <div className="relative w-96 h-96 flex items-center justify-center animate-spin-fast">
                         <div className="absolute w-full h-2 bg-pink-500 shadow-[0_0_20px_pink] top-1/2 -translate-y-1/2"></div>
                         <div className="absolute h-full w-2 bg-pink-500 shadow-[0_0_20px_pink] left-1/2 -translate-x-1/2"></div>
                         <div className="absolute w-64 h-64 border-4 border-pink-400 rounded-full opacity-60 blur-sm"></div>
                    </div>
                );
                break;
            case 'EXPLOSION':
                animationClass = 'animate-explosion-anim';
                content = (
                  <div className="relative w-full h-full flex items-center justify-center z-50">
                     {/* Core Flash */}
                     <div className="absolute w-32 h-32 bg-white rounded-full animate-ping opacity-80 z-40"></div>
                     {/* Shockwave 1 */}
                     <div className="absolute w-64 h-64 rounded-full border-[40px] border-orange-500/60 animate-shockwave-fast z-30"></div>
                     {/* Shockwave 2 (Delayed) */}
                     <div className="absolute w-64 h-64 rounded-full border-[20px] border-red-500/40 animate-shockwave-slow scale-50 z-20"></div>
                     {/* Glow */}
                     <div className="absolute w-[200%] h-[200%] bg-radial-gradient from-orange-500/20 to-transparent animate-fade-out z-10"></div>
                  </div>
                );
                break;
            case 'HEAL':
                animationClass = 'animate-heal-pulse'; 
                content = (
                  <div className="relative w-full h-full flex items-center justify-center z-50">
                      {/* Aura */}
                      <div className="absolute w-64 h-64 bg-green-400/20 rounded-full blur-2xl animate-heal-pulse"></div>
                      <div className="absolute w-48 h-48 border-2 border-green-400/50 rounded-full animate-heal-ring opacity-0"></div>
                      
                      {/* Particles */}
                      <div className="absolute w-2 h-2 bg-green-300 rounded-full animate-heal-particle-1 opacity-0 shadow-[0_0_10px_#86efac]" style={{bottom: '30%', left: '45%'}}></div>
                      <div className="absolute w-3 h-3 bg-green-200 rounded-full animate-heal-particle-2 opacity-0 shadow-[0_0_10px_#bbf7d0]" style={{bottom: '40%', left: '60%'}}></div>
                      <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-heal-particle-3 opacity-0 shadow-[0_0_10px_#4ade80]" style={{bottom: '20%', left: '55%'}}></div>

                      {/* Text Icon */}
                      <div className="relative z-10 flex flex-col items-center animate-float-up-1">
                          <Sparkles size={48} className="text-green-300 filter drop-shadow-[0_0_15px_#4ade80]" />
                      </div>
                  </div>
                );
                break;
            case 'BLOCK':
                animationClass = 'animate-shield-deploy';
                content = (
                  <div className="relative w-64 h-64 flex items-center justify-center">
                     {/* Hex grid bg simulation */}
                     <div className="absolute inset-0 bg-blue-500/10 rounded-full border-2 border-blue-400 animate-pulse-fast backdrop-blur-sm"></div>
                     <div className="absolute inset-0 border border-blue-300/30 rounded-full scale-110 opacity-50"></div>
                     <Shield size={80} className="text-blue-200 z-10 filter drop-shadow-[0_0_10px_blue]" />
                  </div>
                );
                break;
            case 'BUFF_AURA':
                animationClass = 'animate-halo-rise';
                content = (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-56 h-56 rounded-full border-4 border-yellow-400 opacity-0 animate-expand-ring"></div>
                        <div className="absolute w-full h-full bg-gradient-to-t from-yellow-500/30 to-transparent"></div>
                    </div>
                );
                break;
            case 'THUNDER':
                animationClass = 'animate-thunder-strike';
                content = (
                    <div className="relative w-full h-full flex items-center justify-center z-50">
                       {/* Main Bolt - Blue/Cyan */}
                       <svg viewBox="0 0 100 200" className="absolute w-64 h-[150%] top-[-50%] drop-shadow-[0_0_20px_#06b6d4] animate-thunder-bolt" preserveAspectRatio="none">
                          {/* Core jagged line */}
                          <path d="M50,0 L45,20 L55,20 L40,50 L60,50 L30,90 L70,90 L40,140 L60,140 L50,200" fill="none" stroke="#67e8f9" strokeWidth="4" strokeLinejoin="round" />
                          {/* Branches */}
                          <path d="M40,50 L20,70" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
                          <path d="M60,140 L80,160" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" opacity="0.6" />
                       </svg>
                       
                       {/* Screen Flash - Blue Tint */}
                       <div className="absolute inset-0 bg-cyan-100/40 animate-flash-short mix-blend-overlay"></div>
                       
                       {/* Impact Arc */}
                       <div className="absolute bottom-10 w-40 h-10 bg-cyan-400/50 blur-xl rounded-full animate-impact-glow"></div>
                       <div className="absolute bottom-10 w-full h-full flex items-end justify-center pointer-events-none">
                           <div className="w-48 h-12 border-2 border-cyan-300 rounded-[100%] animate-electric-ring opacity-0 scale-0"></div>
                       </div>
                    </div>
                );
                break;
            case 'ICE_NOVA':
                 animationClass = 'animate-ice-shatter';
                 content = (
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        <Snowflake size={140} className="text-cyan-100 filter drop-shadow-[0_0_20px_cyan]" />
                        <div className="absolute inset-0 border-4 border-cyan-200 rounded-full animate-ping opacity-60"></div>
                        <div className="absolute w-full h-full bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                    </div>
                 );
                 break;
            case 'DRAW':
                 animationClass = 'animate-float-up-2';
                 content = <div className="text-emerald-300 font-black text-3xl flex items-center gap-2 filter drop-shadow-[0_0_10px_rgba(16,185,129,1)]"><Copy size={36}/></div>;
                 break;
            case 'CRIT_BUFF':
                 animationClass = 'animate-float-up-2';
                 content = <div className="text-yellow-400 font-black text-3xl flex items-center gap-2 filter drop-shadow-[0_0_10px_orange]"><Crosshair size={36}/></div>;
                 break;
            case 'EVASION_BUFF':
                 animationClass = 'animate-float-up-2';
                 content = <div className="text-indigo-400 font-black text-3xl flex items-center gap-2 filter drop-shadow-[0_0_10px_indigo]"><Wind size={36}/></div>;
                 break;
            case 'LASER':
                 animationClass = 'animate-laser-shoot';
                 content = (
                    <div className="relative w-[1000px] h-32 flex items-center origin-left">
                        {/* Core Beam */}
                        <div className="absolute left-0 w-full h-6 bg-white shadow-[0_0_40px_blue] z-20"></div>
                        {/* Outer Glow */}
                        <div className="absolute left-0 w-full h-24 bg-blue-600/40 blur-xl z-10"></div>
                        {/* Particles */}
                        <div className="absolute left-0 w-full h-full opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSIjZmZmIi8+PC9zdmc+')]"></div>
                    </div>
                 );
                 break;
            case 'VOID':
                 animationClass = 'animate-void-implode';
                 content = (
                     <div className="relative w-80 h-80 flex items-center justify-center">
                         <div className="absolute w-full h-full bg-purple-950/80 rounded-full blur-2xl animate-pulse"></div>
                         <div className="absolute w-56 h-56 border-2 border-purple-500 rounded-full animate-spin-slow-reverse dashed"></div>
                         <Skull size={80} className="text-purple-200 z-10 filter drop-shadow-[0_0_20px_purple]" />
                     </div>
                 );
                 break;
            case 'DRAIN':
                 animationClass = 'animate-drain-soul';
                 content = (
                     <div className="relative w-full h-full flex items-center justify-center">
                         <div className="absolute w-4 h-4 bg-red-600 rounded-full shadow-[0_0_30px_red] animate-ping"></div>
                         <Droplets size={64} className="text-red-500 fill-red-700 filter drop-shadow-[0_0_15px_red]" />
                     </div>
                 );
                 break;
        }

        return (
          <div key={effect.id} className={`absolute inset-0 flex items-center justify-center ${animationClass}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  
  // Player Data (Collection)
  const [collection, setCollection] = useState<Card[]>([]);
  const [upgradePoints, setUpgradePoints] = useState(0);

  // Battle State
  const [playerHp, setPlayerHp] = useState(INITIAL_PLAYER_HP);
  const [enemyHp, setEnemyHp] = useState(INITIAL_ENEMY_HP);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyShield, setEnemyShield] = useState(0); 
  const [enemyFrozen, setEnemyFrozen] = useState(false);
  
  // Buffs
  const [playerBuffs, setPlayerBuffs] = useState<Buffs>({ crit: 0, evasion: 0 });
  const [enemyBuffs, setEnemyBuffs] = useState<Buffs>({ crit: 0, evasion: 0 });
  
  const [energy, setEnergy] = useState(STARTING_ENERGY);
  
  // Deck State (Battle)
  const [drawPile, setDrawPile] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  // Refs for accessing state in closures without triggering re-renders loops
  const deckStateRef = useRef({ draw: drawPile, discard: discardPile, hand: hand });
  const buffsRef = useRef({ player: playerBuffs, enemy: enemyBuffs });
  
  useEffect(() => {
    deckStateRef.current = { draw: drawPile, discard: discardPile, hand: hand };
  }, [drawPile, discardPile, hand]);
  
  useEffect(() => {
      buffsRef.current = { player: playerBuffs, enemy: enemyBuffs };
  }, [playerBuffs, enemyBuffs]);

  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  
  // VFX State
  const [activeEffects, setActiveEffects] = useState<VisualEffect[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<FloatingText[]>([]);
  
  // Gacha State
  const [lastPulledChar, setLastPulledChar] = useState<Character | null>(null);

  // Reward State
  const [rewardCard, setRewardCard] = useState<Card | null>(null);

  // Deck Management State
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // Battle UI State
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [hoveredCardRect, setHoveredCardRect] = useState<DOMRect | null>(null);
  const [playingCards, setPlayingCards] = useState<Set<string>>(new Set());

  // FX
  const [shake, setShake] = useState(false);

  // --- Init ---
  useEffect(() => {
    // Init starter collection
    const starterDeck = [
      createCard(CARD_TEMPLATES[0]), // Slash
      createCard(CARD_TEMPLATES[0]),
      createCard(CARD_TEMPLATES[1]), // Shield
      createCard(CARD_TEMPLATES[1]),
      createCard(CARD_TEMPLATES[2]), // Thunder
      createCard(CARD_TEMPLATES[3]), // Buff
      createCard(CARD_TEMPLATES[11]), // Crit (c13)
      createCard(CARD_TEMPLATES[12]), // Evasion (c14)
      createCard(CARD_TEMPLATES[9]), // Draw 2 (c11)
    ];
    setCollection(starterDeck);
  }, []);

  // --- Helpers ---
  const shuffle = (array: Card[]) => {
      let currentIndex = array.length,  randomIndex;
      while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
  };

  const drawCards = (count: number, currentDrawPile: Card[], currentHand: Card[]) => {
      const drawn: Card[] = [];
      let newDrawPile = [...currentDrawPile];
      
      for (let i = 0; i < count; i++) {
          if (newDrawPile.length > 0) {
              drawn.push(newDrawPile.shift()!);
          } else {
              break; // No recycle
          }
      }
      return {
          newHand: [...currentHand, ...drawn],
          newDrawPile: newDrawPile,
          drawnCount: drawn.length
      };
  };

  const handleDrawCards = (count: number) => {
    // Use refs to get latest state for logic that might be called rapidly or in closures
    const currentDraw = [...deckStateRef.current.draw];
    const currentDiscard = [...deckStateRef.current.discard];
    
    let drawn: Card[] = [];
    
    // First attempt to draw
    const pull = (n: number, source: Card[]) => {
        for(let i=0; i<n; i++){
            if(source.length > 0) drawn.push(source.shift()!);
        }
    };
    
    pull(count, currentDraw);

    // If not enough cards, try to reshuffle
    if (drawn.length < count && currentDiscard.length > 0) {
        triggerEffect('SHUFFLE', 'PLAYER');
        addLog("♻️ 弃牌堆重洗");
        
        // Shuffle discard into draw
        const reshuffled = shuffle([...currentDiscard]);
        currentDraw.push(...reshuffled);
        
        // Clear discard (will be updated in state below)
        currentDiscard.length = 0; 
        
        // Continue drawing
        pull(count - drawn.length, currentDraw);
    }
    
    setDrawPile(currentDraw);
    setDiscardPile(currentDiscard);
    setHand(prev => [...prev, ...drawn]);
  };

  const addLog = (msg: string) => {
    setBattleLog(prev => [msg, ...prev].slice(0, 3));
  };

  const triggerEffect = (type: VisualEffectType, target: 'PLAYER' | 'ENEMY') => {
    const id = Date.now() + Math.random();
    setActiveEffects(prev => [...prev, { id, type, target }]);
    setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== id));
    }, 1000); 
  };

  const spawnFloatingText = (value: string | number, target: 'PLAYER' | 'ENEMY', type: FloatingTextType = 'DAMAGE', isCrit: boolean = false) => {
      const id = Date.now() + Math.random();
      setDamageNumbers(prev => [...prev, { id, value, target, type, isCrit }]);
      setTimeout(() => {
          setDamageNumbers(prev => prev.filter(d => d.id !== id));
      }, 1200);
  };

  // --- Upgrade Logic ---
  const handleUpgrade = (cardUid: string, path: UpgradePathType) => {
    if (upgradePoints < 1) return; // Check cost

    setUpgradePoints(prev => prev - 1);
    setCollection(prev => prev.map(c => {
      if (c.uid === cardUid) {
        return { ...c, currentPath: path, level: 2 };
      }
      return c;
    }));
    setSelectedCardId(null); // Close modal
  };

  const handleEndTurn = () => {
    if (turn === 'PLAYER') {
       setTurn('ENEMY');
    }
  };

  const pullGacha = () => {
    const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    setLastPulledChar(char);
    // Also give a random card
    const randomTemplate = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
    setCollection(prev => [...prev, createCard(randomTemplate)]);
  };

  const claimReward = (type: 'CARD' | 'POINT') => {
    if (type === 'CARD' && rewardCard) {
        setCollection(prev => [...prev, rewardCard]);
    } else {
        setUpgradePoints(prev => prev + 1);
    }
    setScreen('MENU');
    setRewardCard(null);
  };

  // --- Auto-Skip Logic ---
  useEffect(() => {
    if (turn === 'PLAYER' && screen === 'BATTLE') {
      // Determine if we can play any card
      const hasPlayableCard = hand.some(card => {
         const { cost } = getCardStats(card);
         return energy >= cost;
      });

      // If no cards are playable (either due to cost or empty hand), end turn automatically
      if ((!hasPlayableCard && hand.length > 0) || hand.length === 0) {
        // Wait a bit if we are currently animating cards to finish
        const waitTime = playingCards.size > 0 ? 1500 : 1500;
        
        const timer = setTimeout(() => {
           // Double check after delay
           if (playingCards.size > 0) return; 

           if (hand.length === 0 && drawPile.length === 0 && discardPile.length === 0) {
             addLog("⚠️ 弹尽粮绝，回合结束");
           } else if (hand.length === 0) {
             addLog("⚠️ 手牌耗尽，回合结束");
           } else {
             addLog("⚠️ 能量不足，回合结束");
           }
           setTurn('ENEMY');
        }, waitTime);
        return () => clearTimeout(timer);
      }
    }
  }, [turn, hand, energy, screen, playingCards.size, drawPile.length]); 

  // --- Enemy Turn AI ---
  useEffect(() => {
    if (turn === 'ENEMY' && screen === 'BATTLE') {
        const timer = setTimeout(() => {
            if (enemyFrozen) {
                addLog("敌人被冻结，无法行动！");
                setEnemyFrozen(false);
            } else {
                // Enemy Action
                const action = Math.random() > 0.3 ? 'ATTACK' : 'DEFEND';
                
                if (action === 'ATTACK') {
                    // Check Evasion
                    if (buffsRef.current.player.evasion > 0) {
                         addLog("敌人攻击！但你闪避了！");
                         spawnFloatingText("MISS", 'PLAYER', 'DAMAGE');
                         setPlayerBuffs(prev => ({ ...prev, evasion: Math.max(0, prev.evasion - 1) }));
                    } else {
                        const dmg = Math.floor(Math.random() * 10) + 8;
                        let actualDmg = dmg;
                        
                        if (playerShield > 0) {
                            if (playerShield >= dmg) {
                                setPlayerShield(prev => prev - dmg);
                                actualDmg = 0;
                                addLog(`敌人攻击！护盾抵挡了伤害`);
                            } else {
                                actualDmg = dmg - playerShield;
                                setPlayerShield(0);
                                addLog(`敌人攻击！造成了 ${actualDmg} 伤害`);
                            }
                        } else {
                            addLog(`敌人攻击！造成了 ${actualDmg} 伤害`);
                        }

                        if (actualDmg > 0) {
                            setPlayerHp(prev => prev - actualDmg);
                            spawnFloatingText(actualDmg, 'PLAYER', 'DAMAGE');
                            triggerEffect('SLASH', 'PLAYER');
                        } else {
                            spawnFloatingText('BLOCKED', 'PLAYER', 'SHIELD');
                        }
                    }
                } else {
                    const shield = 10;
                    setEnemyShield(prev => prev + shield);
                    addLog("敌人强化了防御");
                    triggerEffect('BLOCK', 'ENEMY');
                    spawnFloatingText(`+${shield} 🛡️`, 'ENEMY', 'SHIELD');
                }
            }

            // End Enemy Turn & Start Player Turn
            setTurn('PLAYER');
            setEnergy(STARTING_ENERGY);
            
            // Handle Draw Logic using the new helper that supports reshuffle
            addLog(`回合开始，准备抽牌`);
            handleDrawCards(2);

            // Decay Shield slightly
            setPlayerShield(prev => Math.floor(prev * 0.5));

            // Check Defeat
            if (playerHp <= 0) {
                setScreen('DEFEAT');
            }

        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [turn, screen, enemyFrozen, playerShield, playerHp]); // Removed hand dependency to avoid loop

  // --- Battle Logic ---

  const startBattle = () => {
    setPlayerHp(INITIAL_PLAYER_HP);
    setEnemyHp(INITIAL_ENEMY_HP);
    setPlayerShield(0);
    setEnemyShield(0);
    setPlayerBuffs({ crit: 0, evasion: 0 });
    setEnemyBuffs({ crit: 0, evasion: 0 });
    setEnemyFrozen(false);
    setEnergy(STARTING_ENERGY);
    
    // Setup Deck (Finite)
    // Ensure deck has exactly 30 cards for battle by filling with random cards if needed
    let deckCards = [...collection];
    
    while (deckCards.length < MAX_DECK_SIZE) {
        const randomTemplate = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        deckCards.push(createCard(randomTemplate));
    }

    const battleDeck = shuffle(deckCards).slice(0, MAX_DECK_SIZE); 
    const initialDraw = drawCards(3, battleDeck, []);
    
    setDrawPile(initialDraw.newDrawPile);
    setHand(initialDraw.newHand);
    setDiscardPile([]);
    
    // Force update ref immediately for logic consistency if called synchronously (though useEffect handles it mostly)
    deckStateRef.current = { draw: initialDraw.newDrawPile, discard: [], hand: initialDraw.newHand };

    setTurn('PLAYER');
    setBattleLog(['战斗开始！']);
    setScreen('BATTLE');
    setActiveEffects([]);
    setDamageNumbers([]);
    setHoveredCard(null);
    setPlayingCards(new Set());
  };

  const playCard = (card: Card) => {
    if (turn !== 'PLAYER' || energy < getCardStats(card).cost) return;
    if (playingCards.has(card.uid)) return; // Prevent double click

    // 1. Trigger Animation
    setPlayingCards(prev => new Set(prev).add(card.uid));
    setHoveredCard(null);

    // 2. Pay Cost Immediately
    const stats = getCardStats(card);
    setEnergy(prev => prev - stats.cost);

    // 3. Delayed Logic Execution (Sync with CSS animation)
    setTimeout(() => {
        executeCardLogic(card);
        // Move to Discard
        setHand(prev => prev.filter(c => c.uid !== card.uid));
        setDiscardPile(prev => [...prev, card]);

        setPlayingCards(prev => {
            const next = new Set(prev);
            next.delete(card.uid);
            return next;
        });
    }, 300); // Shorter delay matches new animation speed
  };

  const executeCardLogic = (card: Card) => {
    const stats = getCardStats(card);
    
    // Player Action
    addLog(`你使用了 ${stats.name}！`);
    
    // -- ATTACK LOGIC --
    if (card.type === 'ATTACK') {
      let damage = stats.val;
      let isTrueDamage = false;
      let isCrit = false;

      // Special: Double Slash
      if (card.currentPath === 'SPECIAL' && (card.id === 'c1' || card.id === 'c6')) {
         damage = Math.floor(damage * 2);
         addLog("双星连斩！200%伤害");
      }
      // Special: Double Spin (c6)
      if (card.currentPath === 'SPECIAL' && card.id === 'c6') {
         // Logic for multi-hit usually involves loop, here simplified
         damage = Math.floor(damage * 2);
      }

      // Special: Execute (c5)
      if (card.currentPath === 'SPECIAL' && card.id === 'c5') {
         if (enemyHp < 30) {
            damage = 999;
            addLog("聚变打击！斩杀！");
            triggerEffect('EXPLOSION', 'ENEMY');
         }
      }
      
      // CRIT CHECK
      if (playerBuffs.crit > 0) {
          isCrit = true;
          damage = damage * 2;
          setPlayerBuffs(prev => ({ ...prev, crit: prev.crit - 1 }));
          addLog("暴击！伤害翻倍！");
          
          // Special: Weakness Analysis (c13)
          // If we had a mechanism to track source of buff, we could trigger draw here.
          // Simplified: We won't track source card for buffs in this version.
      }
      
      // EVASION CHECK (Enemy)
      let isMiss = false;
      if (enemyBuffs.evasion > 0) {
          damage = 0;
          isMiss = true;
          setEnemyBuffs(prev => ({ ...prev, evasion: prev.evasion - 1 }));
          addLog("攻击未命中！敌人闪避了");
      }

      // Apply Damage vs Shield
      let actualDmg = damage;
      if (!isTrueDamage && !isMiss && enemyShield > 0) {
         if (enemyShield >= damage) {
            setEnemyShield(prev => prev - damage);
            actualDmg = 0;
            addLog("护盾抵挡了攻击");
         } else {
            actualDmg = damage - enemyShield;
            setEnemyShield(0);
         }
      }

      if (isMiss) {
          spawnFloatingText('MISS', 'ENEMY', 'DAMAGE');
      } else if (actualDmg > 0) {
        setEnemyHp(prev => prev - actualDmg);
        setShake(true);
        setTimeout(() => setShake(false), 300);
        spawnFloatingText(actualDmg, 'ENEMY', 'DAMAGE', isCrit);
      } else {
        spawnFloatingText('BLOCKED', 'ENEMY', 'SHIELD');
      }
      
      // Special: Life Drain (c7)
      if (card.id === 'c7' && !isMiss) {
         setPlayerHp(prev => Math.min(prev + actualDmg, INITIAL_PLAYER_HP));
         triggerEffect('DRAIN', 'PLAYER');
         spawnFloatingText(`+${actualDmg} ❤️`, 'PLAYER', 'HEAL');
      }

      if (!isMiss) triggerEffect(stats.fx, 'ENEMY');
    } 
    // -- DEFEND LOGIC --
    else if (card.type === 'DEFEND') {
      setPlayerShield(prev => prev + stats.val);
      triggerEffect(stats.fx, 'PLAYER');
      spawnFloatingText(`+${stats.val} 🛡️`, 'PLAYER', 'SHIELD');
      
      if (card.currentPath === 'SPECIAL' && card.id === 'c2') {
        setEnemyFrozen(true);
        addLog("寒气侵袭！敌人被冻结");
        triggerEffect('ICE_NOVA', 'ENEMY');
      }
    } 
    // -- SKILL LOGIC --
    else if (card.type === 'SKILL') {
       if (stats.fx === 'DRAW') {
           const count = stats.val;
           addLog(`战术补给！抽 ${count} 张牌`);
           triggerEffect('DRAW', 'PLAYER');
           spawnFloatingText(`+${count} 🃏`, 'PLAYER', 'BUFF');
           handleDrawCards(count);
       }
       else if (stats.fx === 'BUFF_AURA') {
         let energyGain = stats.val > 0 ? stats.val : 1;
         setEnergy(prev => prev + energyGain);
         triggerEffect('BUFF_AURA', 'PLAYER');
         spawnFloatingText(`+${energyGain} ⚡`, 'PLAYER', 'BUFF');
       }
       else if (stats.fx === 'HEAL') {
           setPlayerHp(prev => Math.min(prev + stats.val, INITIAL_PLAYER_HP));
           triggerEffect('HEAL', 'PLAYER');
           spawnFloatingText(`+${stats.val} ❤️`, 'PLAYER', 'HEAL');
       }
       else if (stats.fx === 'VOID') {
           setPlayerHp(prev => Math.max(1, prev - 10));
           setEnergy(prev => prev + 2);
           addLog("禁忌契约：牺牲生命获得能量");
           triggerEffect('VOID', 'PLAYER');
           spawnFloatingText(`-10 ❤️`, 'PLAYER', 'DAMAGE');
           spawnFloatingText(`+2 ⚡`, 'PLAYER', 'BUFF');
       }
       else if (stats.fx === 'CRIT_BUFF') {
           setPlayerBuffs(prev => ({ ...prev, crit: prev.crit + stats.val }));
           triggerEffect('CRIT_BUFF', 'PLAYER');
           spawnFloatingText(`CRIT +${stats.val}`, 'PLAYER', 'BUFF');
           
           // Special: Weakness Analysis logic requires tracking, simplified here:
           if (card.currentPath === 'SPECIAL') {
               // handleDrawCards(1); inside execute logic
           }
       }
       else if (stats.fx === 'EVASION_BUFF') {
           setPlayerBuffs(prev => ({ ...prev, evasion: prev.evasion + stats.val }));
           triggerEffect('EVASION_BUFF', 'PLAYER');
           spawnFloatingText(`EVADE +${stats.val}`, 'PLAYER', 'BUFF');
           
           if (card.currentPath === 'SPECIAL') {
               // Deal reflect dmg immediately or set status
               // Simplified for now
           }
       }
    }

    // Check Win Condition (Delayed)
    // Handled in useEffect
  };
  
  // Check Win Condition Effect
  useEffect(() => {
    if (screen === 'BATTLE' && enemyHp <= 0) {
        setScreen('VICTORY');
        setTimeout(() => {
             const randomTemplate = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
             setRewardCard(createCard(randomTemplate));
             setScreen('REWARD');
        }, 2000);
    }
  }, [enemyHp, screen]);

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in relative z-10">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 filter drop-shadow-[0_0_10px_rgba(233,69,96,0.5)]">
          星轨契约
        </h1>
        <h2 className="text-2xl font-light tracking-[0.5em] text-blue-200">STAR ORBIT</h2>
      </div>
      
      <div className="flex flex-col gap-4 w-64">
        <Button onClick={startBattle} variant="primary">
          <Sword size={20} /> 开始任务
        </Button>
        <Button onClick={() => setScreen('DECK')} variant="secondary">
          <Layers size={20} /> 卡组与升级
        </Button>
        <Button onClick={() => setScreen('GACHA')} variant="outline">
          <Sparkles size={20} /> 共鸣契约
        </Button>
      </div>

      <div className="absolute bottom-8 text-xs text-gray-500 font-mono">
        ver 1.1.0 | Deck: {collection.length} Cards
      </div>
    </div>
  );

  const renderDeckScreen = () => {
    const selectedCard = collection.find(c => c.uid === selectedCardId);

    return (
      <div className="flex flex-col h-full bg-[#0f0f1a] relative z-20">
        <div className="p-4 flex items-center justify-between border-b border-gray-700 bg-gray-900/80 backdrop-blur">
          <Button onClick={() => setScreen('MENU')} variant="outline" className="py-2 px-4 text-sm">返回</Button>
          <div className="flex flex-col items-center">
             <h2 className="text-xl font-bold text-white">卡组管理 ({collection.length})</h2>
             <div className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                 <Star size={12} fill="currentColor" />
                 可用升级点数: {upgradePoints}
             </div>
          </div>
          <div className="w-16"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-4 gap-4 pb-32">
          {collection.map(card => (
            <div key={card.uid} className="flex justify-center">
              <CardComponent 
                card={card} 
                onClick={() => setSelectedCardId(card.uid)}
              />
            </div>
          ))}
        </div>

        {/* Upgrade Modal */}
        {selectedCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-600 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col gap-6 animate-fade-in-up">
              {/* Upgrade content same as before, condensed for brevity */}
               <div className="flex justify-between items-start">
                 <h3 className="text-2xl font-bold text-white">卡牌改造: {getCardStats(selectedCard).name}</h3>
                 <button onClick={() => setSelectedCardId(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm text-gray-400">当前状态</div>
                  <CardComponent card={selectedCard} disabled />
                </div>
                <div className="text-gray-500 hidden md:block"><ChevronRight size={32}/></div>
                {selectedCard.currentPath === null ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    {/* Power Path */}
                    <div className={`bg-red-900/20 border ${upgradePoints > 0 ? 'border-red-500/30 hover:bg-red-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'POWER')}>
                       <div className="flex items-center gap-2 mb-2 text-red-400 font-bold"><Flame size={18}/> 强袭</div>
                       <div className="text-xs text-gray-300">{selectedCard.upgradeOptions.POWER?.description}</div>
                    </div>
                    {/* Speed Path */}
                    <div className={`bg-blue-900/20 border ${upgradePoints > 0 ? 'border-blue-500/30 hover:bg-blue-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'SPEED')}>
                       <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold"><Zap size={18}/> 急速</div>
                       <div className="text-xs text-gray-300">{selectedCard.upgradeOptions.SPEED?.description}</div>
                    </div>
                    {/* Special Path */}
                    <div className={`bg-yellow-900/20 border ${upgradePoints > 0 ? 'border-yellow-500/30 hover:bg-yellow-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'SPECIAL')}>
                       <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold"><Star size={18}/> 觉醒</div>
                       <div className="text-xs text-gray-300">{selectedCard.upgradeOptions.SPECIAL?.description}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">已改造</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBattle = () => (
    <div className="flex flex-col h-full relative">
      {/* Top Bar */}
      <div className="h-16 bg-gray-900/80 backdrop-blur border-b border-gray-700 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
           <button onClick={() => setScreen('MENU')} className="text-gray-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
           <span className="font-bold text-gray-200">第7星区-Alpha</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
           <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-600">
             <Box size={14} className="text-blue-400"/>
             <span>牌库: {drawPile.length}</span>
           </div>
           <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-600 opacity-60">
             <Layers size={14} className="text-gray-400"/>
             <span>弃牌: {discardPile.length}</span>
           </div>
        </div>
      </div>

      {/* Battle Arena */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-center items-center">
        {/* Background Particles/Grid */}
        <div className="absolute inset-0 bg-[#121220]" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 50% 50%, #1f2235 0%, #121220 100%)' 
             }}>
             <div className="absolute inset-0 opacity-20" 
                  style={{ backgroundImage: 'linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
             </div>
        </div>

        {/* Characters */}
        <div className="relative z-10 w-full max-w-2xl flex justify-between items-end px-8 pb-8 h-full">
          
          {/* Player */}
          <div className="flex flex-col items-center gap-2 transition-all duration-500">
            <div className="relative">
               <EffectLayer effects={activeEffects.filter(e => e.target === 'PLAYER')} />
               <div className="w-32 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center relative overflow-hidden group">
                  <User size={64} className="text-white/80" />
                  {playerHp < INITIAL_PLAYER_HP && (
                    <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
                  )}
               </div>
               
               {/* Shield & Buffs Container */}
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-20 w-full justify-center">
                   {playerShield > 0 && (
                     <div className="bg-gray-900/80 border border-blue-400 text-blue-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm">
                       <Shield size={12} className="text-blue-400" fill="currentColor" />
                       <span className="font-bold text-xs font-mono">{playerShield}</span>
                     </div>
                   )}
                   {playerBuffs.crit > 0 && (
                     <div className="bg-gray-900/80 border border-yellow-400 text-yellow-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm animate-pulse">
                       <Crosshair size={12} className="text-yellow-400" />
                       <span className="font-bold text-xs font-mono">{playerBuffs.crit}</span>
                     </div>
                   )}
                   {playerBuffs.evasion > 0 && (
                     <div className="bg-gray-900/80 border border-indigo-400 text-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm animate-pulse">
                       <Wind size={12} className="text-indigo-400" />
                       <span className="font-bold text-xs font-mono">{playerBuffs.evasion}</span>
                     </div>
                   )}
               </div>

               <div className="absolute inset-0 pointer-events-none z-[60] flex justify-center items-center">
                  {damageNumbers.filter(d => d.target === 'PLAYER').map(d => (
                      <div key={d.id} className={`absolute font-black stroke-black drop-shadow-lg flex items-center justify-center whitespace-nowrap
                           ${d.type === 'HEAL' ? 'text-4xl text-green-400 animate-float-up-2' :
                             d.type === 'SHIELD' ? 'text-4xl text-blue-400 animate-float-up-2' :
                             d.type === 'BUFF' ? 'text-3xl text-yellow-400 animate-float-up-2' :
                             d.value === 'MISS' ? 'text-3xl text-gray-400 animate-float-damage' : 
                             (typeof d.value === 'number' && d.value > 15) || d.isCrit 
                               ? 'text-6xl text-red-500 animate-crit-shake' 
                               : 'text-4xl text-red-500 animate-float-damage'}
                      `} style={{textShadow: '2px 2px 0 #000'}}>
                          {d.value}
                      </div>
                  ))}
               </div>
            </div>
            {/* Player Stats */}
            <div className="w-32 space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>生命值</span>
                <span>{playerHp}/{INITIAL_PLAYER_HP}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${Math.max(0, (playerHp/INITIAL_PLAYER_HP)*100)}%` }} />
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700 font-black text-6xl opacity-20 italic">
            VS
          </div>

          {/* Enemy */}
          <div className={`flex flex-col items-center gap-2 transition-all duration-100 ${shake ? 'translate-x-2' : ''}`}>
             <div className="relative">
               <EffectLayer effects={activeEffects.filter(e => e.target === 'ENEMY')} />
               <div className={`w-32 h-48 bg-gradient-to-br from-red-900 to-gray-800 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center border-2 ${enemyFrozen ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-red-500/30'}`}>
                  {enemyFrozen ? (
                      <Snowflake size={64} className="text-blue-200 animate-pulse" />
                  ) : (
                      <span className="text-6xl filter drop-shadow-lg">👾</span>
                  )}
               </div>
               
               {/* Enemy Buffs */}
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-20 w-full justify-center">
                    {enemyShield > 0 && (
                        <div className="bg-gray-900/80 border border-gray-400 text-gray-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm">
                        <Shield size={12} className="text-gray-400" fill="currentColor" />
                        <span className="font-bold text-xs font-mono">{enemyShield}</span>
                        </div>
                    )}
                    {enemyBuffs.evasion > 0 && (
                     <div className="bg-gray-900/80 border border-indigo-400 text-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg backdrop-blur-sm animate-pulse">
                       <Wind size={12} className="text-indigo-400" />
                       <span className="font-bold text-xs font-mono">{enemyBuffs.evasion}</span>
                     </div>
                   )}
               </div>

               <div className="absolute inset-0 pointer-events-none z-[60] flex justify-center items-center">
                  {damageNumbers.filter(d => d.target === 'ENEMY').map(d => (
                      <div key={d.id} className={`absolute font-black stroke-black drop-shadow-lg flex items-center justify-center whitespace-nowrap
                           ${d.type === 'HEAL' ? 'text-4xl text-green-400 animate-float-up-2' :
                             d.type === 'SHIELD' ? 'text-4xl text-blue-400 animate-float-up-2' :
                             d.type === 'BUFF' ? 'text-3xl text-yellow-400 animate-float-up-2' :
                             d.value === 'MISS' ? 'text-3xl text-gray-400 animate-float-damage' : 
                             (typeof d.value === 'number' && d.value > 15) || d.isCrit 
                               ? 'text-6xl text-red-500 animate-crit-shake' 
                               : 'text-4xl text-white animate-float-damage'}
                      `} style={{textShadow: '2px 2px 0 #000'}}>
                          {d.value}
                      </div>
                  ))}
               </div>
            </div>
            <div className="w-32 space-y-1">
              <div className="flex justify-between text-xs text-gray-300">
                <span>生命值</span>
                <span>{Math.max(0, enemyHp)}/{INITIAL_ENEMY_HP}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${Math.max(0, (enemyHp/INITIAL_ENEMY_HP)*100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Combat Log */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-64 text-center pointer-events-none space-y-1">
          {battleLog.map((log, i) => (
            <div key={i} className={`text-sm font-bold shadow-sm ${i===0 ? 'text-white scale-110' : 'text-gray-500 scale-90'} transition-all`}>
              {log}
            </div>
          ))}
        </div>

      </div>

      {/* Floating Tooltip - Now positioned relative to card */}
      {hoveredCard && hoveredCardRect && (
        <div 
            className="fixed z-50 pointer-events-none animate-fade-in-up origin-bottom"
            style={{ 
                left: hoveredCardRect.left + (hoveredCardRect.width / 2), 
                top: hoveredCardRect.top - 20,
                transform: 'translate(-50%, -100%)'
            }}
        >
            {(() => {
                const { val, cost, fx, longDesc, name: cardName } = getCardStats(hoveredCard);
                const type = hoveredCard.type;
                return (
                    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-500 p-4 rounded-xl shadow-2xl text-left w-64 relative">
                        <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-700">
                            <span className="font-bold text-white text-base">{cardName}</span>
                            <span className="text-yellow-400 text-sm font-mono">Cost: {cost}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed mb-3">
                            {longDesc}
                        </p>
                        <div className="flex gap-2 text-[10px] font-mono text-gray-500 uppercase">
                            <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{fx}</span>
                            <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">{TYPE_MAP[type]}</span>
                        </div>
                        {/* Down Arrow */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-500"></div>
                    </div>
                );
            })()}
        </div>
      )}

      {/* Cards UI */}
      <div className="h-72 bg-gray-900/90 border-t border-gray-700 relative z-30 flex flex-col items-center">
        <div className="absolute top-2 left-0 right-0 px-8 flex justify-between items-center z-40 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
              <div className="text-xs text-gray-400 font-mono flex items-center gap-1">
                能量 <span className="text-yellow-400 font-bold ml-1 text-lg">⚡ {energy}</span>
              </div>
          </div>
          
          {turn === 'PLAYER' && (
              <div className="pointer-events-auto">
                <Button onClick={handleEndTurn} variant="danger" className="py-1 px-4 text-sm h-8">
                    结束回合
                </Button>
              </div>
          )}
        </div>
        
        {turn === 'PLAYER' ? (
          <div className="flex-1 w-full overflow-x-auto overflow-y-hidden px-8 flex gap-4 items-center justify-start scrollbar-hide pt-8 pb-4">
            {hand.map(card => (
              <CardComponent 
                key={card.uid} 
                card={card} 
                disabled={energy < getCardStats(card).cost}
                onClick={() => playCard(card)}
                onHover={(c, r) => { setHoveredCard(c); setHoveredCardRect(r); }}
                isPlaying={playingCards.has(card.uid)}
              />
            ))}
            {hand.length === 0 && (
               <div className="text-gray-500 animate-pulse w-full text-center mt-12">
                   {drawPile.length === 0 ? "弹尽粮绝!" : "回合结束..."}
               </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-red-400 font-bold animate-pulse tracking-widest">
            {enemyFrozen ? '敌方被冻结...' : '敌方行动中...'}
          </div>
        )}
      </div>

    </div>
  );

  // ... (Gacha, Reward, Victory, Defeat renders remain mostly same)
  const renderGacha = () => (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 relative z-20 space-y-8 p-8">
      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">共鸣契约</h2>
      
      {lastPulledChar ? (
         <div className="flex flex-col items-center animate-fade-in-up">
            <CharacterCard char={lastPulledChar} />
            <div className="mt-4 text-white text-xl font-bold">获得: {lastPulledChar.name}</div>
            <div className="text-gray-400 text-sm mt-1">同时也获得了一张随机卡牌!</div>
            <Button onClick={() => setLastPulledChar(null)} className="mt-8" variant="primary">继续</Button>
         </div>
      ) : (
        <div className="text-center space-y-8">
           <div className="w-48 h-48 border-4 border-dashed border-gray-700 rounded-full flex items-center justify-center mx-auto">
              <Sparkles size={64} className="text-gray-700" />
           </div>
           <Button onClick={pullGacha} variant="primary" className="w-64">
             <Sparkles size={20} /> 共鸣 (免费)
           </Button>
        </div>
      )}
      
      {!lastPulledChar && (
        <Button onClick={() => setScreen('MENU')} variant="secondary">返回</Button>
      )}
    </div>
  );

  const renderReward = () => (
     <div className="flex flex-col items-center justify-center h-full bg-black/90 z-50 p-8 space-y-8">
        <h2 className="text-4xl font-bold text-yellow-400 mb-8">战斗胜利!</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {rewardCard && (
               <div className="flex flex-col items-center gap-4 cursor-pointer group" onClick={() => claimReward('CARD')}>
                  <div className="text-white font-bold text-xl group-hover:text-yellow-300">获取卡牌</div>
                  <CardComponent card={rewardCard} disabled />
               </div>
           )}
           <div className="flex flex-col items-center gap-4 cursor-pointer group" onClick={() => claimReward('POINT')}>
              <div className="text-white font-bold text-xl group-hover:text-yellow-300">升级点数 +1</div>
              <div className="w-32 h-48 border-2 border-yellow-500/50 bg-yellow-900/20 rounded-xl flex items-center justify-center">
                 <Star size={48} className="text-yellow-400" />
              </div>
           </div>
        </div>
     </div>
  );

  const renderVictory = () => (
    <div className="flex flex-col items-center justify-center h-full bg-black z-50 space-y-8">
        <h1 className="text-6xl font-black text-yellow-500">VICTORY</h1>
        <Button onClick={() => setScreen('MENU')} variant="primary">返回主菜单</Button>
    </div>
  );

  const renderDefeat = () => (
    <div className="flex flex-col items-center justify-center h-full bg-black z-50 space-y-8">
        <h1 className="text-6xl font-black text-red-600">DEFEAT</h1>
        <Skull size={64} className="text-red-600" />
        <Button onClick={() => setScreen('MENU')} variant="secondary">返回主菜单</Button>
    </div>
  );

  return (
    <div className="w-full h-screen bg-gray-950 text-white overflow-hidden font-sans select-none">
      {screen === 'MENU' && renderMenu()}
      {screen === 'BATTLE' && renderBattle()}
      {screen === 'DECK' && renderDeckScreen()}
      {screen === 'GACHA' && renderGacha()}
      {screen === 'REWARD' && renderReward()}
      {screen === 'VICTORY' && renderVictory()}
      {screen === 'DEFEAT' && renderDefeat()}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes spin-slow-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  @keyframes spin-fast {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-fast {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.05); }
  }
  
  /* DEAL ANIMATION */
  @keyframes deal {
    from { transform: translateY(100%) scale(0.5); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
  .animate-deal { animation: deal 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards; }

  /* REFINED CARD PLAY ANIMATION */
  @keyframes card-play-anim {
    0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
    15% { transform: translateY(30px) scale(0.9) rotate(-3deg); opacity: 1; }
    40% { transform: translateY(-80px) scaleX(0.8) scaleY(1.2) rotate(2deg); opacity: 0.8; }
    100% { transform: translateY(-400px) scale(0.5); opacity: 0; }
  }
  .animate-card-play { animation: card-play-anim 0.35s cubic-bezier(0.3, -0.1, 0.1, 1) forwards; }
  
  /* NEW SLASH ANIMATIONS */
  @keyframes slash-core {
    0% { width: 0; opacity: 0; transform: scaleX(0) rotate(-30deg); }
    20% { width: 120%; opacity: 1; transform: scaleX(1) rotate(-30deg); }
    100% { width: 120%; opacity: 0; transform: scaleX(1.2) rotate(-30deg); }
  }
  @keyframes slash-trail {
    0% { opacity: 0; transform: translateX(-50px) rotate(-30deg); }
    30% { opacity: 0.8; transform: translateX(0) rotate(-30deg); }
    100% { opacity: 0; transform: translateX(50px) rotate(-30deg); }
  }
  @keyframes flash-impact {
    0% { opacity: 0; }
    20% { opacity: 1; }
    100% { opacity: 0; }
  }
  .animate-slash-core { animation: slash-core 0.2s cubic-bezier(0, 0.9, 0.1, 1) forwards; }
  .animate-slash-trail { animation: slash-trail 0.3s ease-out forwards; }
  .animate-flash-impact { animation: flash-impact 0.2s ease-out forwards; }

  /* NEW THUNDER ANIMATIONS */
  @keyframes thunder-bolt {
    0% { opacity: 0; stroke-dasharray: 1000; stroke-dashoffset: 1000; }
    10% { opacity: 1; stroke-dashoffset: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes flash-short {
    0%, 100% { opacity: 0; }
    10% { opacity: 0.8; }
    30% { opacity: 0; }
  }
  @keyframes electric-ring {
    0% { transform: scale(0); opacity: 1; border-width: 4px; }
    100% { transform: scale(2); opacity: 0; border-width: 0px; }
  }
  @keyframes impact-glow {
    0% { opacity: 0; transform: scale(0.5); }
    20% { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(1.5); }
  }
  .animate-thunder-bolt { animation: thunder-bolt 0.4s ease-out forwards; }
  .animate-flash-short { animation: flash-short 0.4s ease-out forwards; }
  .animate-electric-ring { animation: electric-ring 0.5s ease-out 0.1s forwards; }
  .animate-impact-glow { animation: impact-glow 0.5s ease-out forwards; }

  /* NEW EXPLOSION ANIMATIONS */
  @keyframes shockwave-fast {
    0% { transform: scale(0); opacity: 1; border-width: 40px; }
    100% { transform: scale(2); opacity: 0; border-width: 0px; }
  }
  @keyframes shockwave-slow {
    0% { transform: scale(0); opacity: 0; }
    20% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes fade-out {
    0% { opacity: 0.8; transform: scale(0.5); }
    100% { opacity: 0; transform: scale(1.5); }
  }
  .animate-shockwave-fast { animation: shockwave-fast 0.5s ease-out forwards; }
  .animate-shockwave-slow { animation: shockwave-slow 0.7s ease-out 0.1s forwards; }
  .animate-fade-out { animation: fade-out 0.6s ease-out forwards; }

  /* SPIN SLASH */
  .animate-spin-slash { animation: spin-fast 0.5s linear forwards, fade-out 0.5s ease-in forwards; }

  /* SHIELD ANIMATIONS */
  @keyframes shield-deploy {
    0% { transform: scale(0.6); opacity: 0; }
    60% { transform: scale(1.1); opacity: 1; }
    80% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1); opacity: 0; }
  }
  .animate-shield-deploy { animation: shield-deploy 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  
  /* HEAL & DRAW ANIMATIONS */
  @keyframes float-up-1 {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    20% { opacity: 1; transform: translateY(-10px) scale(1.2); }
    100% { transform: translateY(-60px) scale(1); opacity: 0; }
  }
  @keyframes float-up-2 {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    30% { opacity: 1; transform: translateY(-15px) scale(1); }
    100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
  }
  @keyframes heal-pulse {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); opacity: 0.5; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  @keyframes heal-ring {
    0% { transform: scale(0.5); opacity: 0; border-width: 4px; }
    30% { opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; border-width: 0px; }
  }
  @keyframes heal-particle {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    20% { opacity: 1; transform: translateY(-10px) scale(1); }
    100% { transform: translateY(-40px) scale(0); opacity: 0; }
  }
  .animate-float-up-1 { animation: float-up-1 0.8s ease-out forwards; }
  .animate-float-up-2 { animation: float-up-2 0.8s ease-out forwards; }
  .animate-heal-pulse { animation: heal-pulse 1s ease-out forwards; }
  .animate-heal-ring { animation: heal-ring 0.8s ease-out forwards; }
  .animate-heal-particle-1 { animation: heal-particle 0.8s ease-out 0.1s forwards; }
  .animate-heal-particle-2 { animation: heal-particle 0.9s ease-out 0.2s forwards; }
  .animate-heal-particle-3 { animation: heal-particle 0.7s ease-out 0s forwards; }
  
  /* BUFF */
  @keyframes halo-rise {
    0% { transform: translateY(20px) scale(0.8); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
  }
  @keyframes expand-ring {
    0% { transform: scale(0.8); opacity: 0; border-width: 4px; }
    30% { opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; border-width: 0px; }
  }
  .animate-halo-rise { animation: halo-rise 1s ease-out forwards; }
  .animate-expand-ring { animation: expand-ring 0.8s ease-out forwards; }

  /* ICE */
  @keyframes ice-shatter {
    0% { transform: scale(0); opacity: 0; }
    40% { transform: scale(1.2); opacity: 1; }
    60% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; filter: blur(4px); }
  }
  .animate-ice-shatter { animation: ice-shatter 0.6s ease-out forwards; }

  /* LASER */
  @keyframes laser-shoot {
      0% { width: 0%; opacity: 0; }
      10% { width: 100%; opacity: 1; }
      80% { opacity: 1; }
      100% { width: 100%; opacity: 0; }
  }
  .animate-laser-shoot { animation: laser-shoot 0.5s ease-out forwards; }

  /* VOID */
  @keyframes void-implode {
      0% { transform: scale(2); opacity: 0; }
      50% { transform: scale(1); opacity: 1; }
      80% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(0); opacity: 0; }
  }
  .animate-void-implode { animation: void-implode 0.8s ease-in forwards; }

  /* DRAIN */
  @keyframes drain-soul {
      0% { transform: scale(0.5); opacity: 0; }
      40% { opacity: 1; transform: scale(1); }
      100% { transform: scale(2); opacity: 0; filter: blur(4px); }
  }
  .animate-drain-soul { animation: drain-soul 0.8s ease-out forwards; }
  
  /* DAMAGE FLOATERS */
  @keyframes float-damage {
    0% { opacity: 1; transform: translateY(0) scale(0.5); }
    20% { opacity: 1; transform: translateY(-20px) scale(1.5); }
    80% { opacity: 1; transform: translateY(-40px) scale(1); }
    100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
  }
  .animate-float-damage { animation: float-damage 0.8s ease-out forwards; }
  
  @keyframes crit-shake {
    0% { opacity: 1; transform: translateY(0) scale(0.5); }
    10% { transform: translateY(-10px) scale(2) rotate(-5deg); color: #fff; }
    20% { transform: translateY(-15px) scale(1.8) rotate(5deg); color: #ef4444; }
    30% { transform: translateY(-20px) scale(1.9) rotate(-5deg); }
    80% { opacity: 1; transform: translateY(-40px) scale(1.5); }
    100% { opacity: 0; transform: translateY(-60px) scale(1); }
  }
  .animate-crit-shake { animation: crit-shake 0.8s ease-out forwards; }

  /* Scrollbar hide utility */
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
  }

  .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
  .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
  .animate-spin-slow { animation: spin-slow 8s linear infinite; }
  .animate-spin-slow-reverse { animation: spin-slow-reverse 12s linear infinite; }
  .animate-spin-fast { animation: spin-fast 0.5s linear infinite; }
`;
document.head.appendChild(style);
