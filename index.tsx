import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, Sword, Shield, Zap, Heart, RefreshCw, ChevronRight, Star, User, Flame, Snowflake, Crosshair, ArrowUpCircle, Layers, Gift } from 'lucide-react';

// --- Game Constants & Types ---

type GameScreen = 'MENU' | 'BATTLE' | 'GACHA' | 'VICTORY' | 'DEFEAT' | 'DECK' | 'REWARD';

type UpgradePathType = 'POWER' | 'SPEED' | 'SPECIAL';

interface UpgradeOption {
  id: string;
  type: UpgradePathType;
  name: string;
  description: string;
  valueMod: number; // Add to base value
  costMod: number; // Add to base cost (usually negative)
  newFxType?: VisualEffectType; // Override VFX
}

interface Card {
  id: string;
  uid: string; // Unique ID for instance
  name: string;
  type: 'ATTACK' | 'DEFEND' | 'SKILL';
  baseValue: number;
  baseCost: number;
  description: string;
  color: string;
  baseFxType: VisualEffectType;
  level: number;
  maxLevel: number;
  upgradeOptions: {
    [key in UpgradePathType]?: UpgradeOption;
  };
  currentPath: UpgradePathType | null; // null = base form
}

interface Character {
  id: string;
  name: string;
  rarity: 'R' | 'SR' | 'SSR';
  element: 'Fire' | 'Water' | 'Wind';
  avatarColor: string;
}

type VisualEffectType = 'SLASH' | 'DOUBLE_SLASH' | 'EXPLOSION' | 'SHIELD' | 'HEAL' | 'HIT' | 'THUNDER' | 'ICE_NOVA' | 'LASER' | 'BUFF_AURA';

interface VisualEffect {
  id: number;
  type: VisualEffectType;
  target: 'PLAYER' | 'ENEMY';
}

const INITIAL_PLAYER_HP = 100;
const INITIAL_ENEMY_HP = 100;
const MAX_ENERGY = 3;

const TYPE_MAP: Record<string, string> = {
  ATTACK: '攻击',
  DEFEND: '防御',
  SKILL: '技能'
};

const ELEMENT_MAP: Record<string, string> = {
  Fire: '火',
  Water: '水',
  Wind: '风'
};

// --- Data Factories ---

const createCard = (template: Partial<Card>): Card => {
  return {
    uid: Math.random().toString(36).substr(2, 9),
    level: 1,
    maxLevel: 2, // Simplified for demo
    currentPath: null,
    upgradeOptions: {},
    ...template
  } as Card;
};

// --- Card Definitions ---

const CARD_TEMPLATES: Card[] = [
  { 
    id: 'c1', name: '星芒斩', type: 'ATTACK', baseValue: 15, baseCost: 1, color: '#e94560', baseFxType: 'SLASH',
    description: '基础的快速斩击。',
    upgradeOptions: {
      POWER: { id: 'u1_p', type: 'POWER', name: '巨星斩', description: '伤害大幅提升', valueMod: 10, costMod: 0, newFxType: 'EXPLOSION' },
      SPEED: { id: 'u1_s', type: 'SPEED', name: '星虹闪', description: '0费，伤害略降', valueMod: -5, costMod: -1, newFxType: 'SLASH' },
      SPECIAL: { id: 'u1_x', type: 'SPECIAL', name: '双星连斩', description: '造成200%总伤害', valueMod: 0, costMod: 0, newFxType: 'DOUBLE_SLASH' }
    }
  } as Card,
  { 
    id: 'c2', name: '星轨护盾', type: 'DEFEND', baseValue: 12, baseCost: 1, color: '#0f3460', baseFxType: 'SHIELD',
    description: '生成护盾抵挡伤害。',
    upgradeOptions: {
      POWER: { id: 'u2_p', type: 'POWER', name: '星云壁垒', description: '护盾值翻倍，费用+1', valueMod: 12, costMod: 1, newFxType: 'SHIELD' },
      SPEED: { id: 'u2_s', type: 'SPEED', name: '紧急护盾', description: '0费，护盾略降', valueMod: -4, costMod: -1, newFxType: 'SHIELD' },
      SPECIAL: { id: 'u2_x', type: 'SPECIAL', name: '冰霜装甲', description: '获得护盾并冻结敌人(跳过下回合)', valueMod: -2, costMod: 1, newFxType: 'ICE_NOVA' }
    }
  } as Card,
  { 
    id: 'c3', name: '雷鸣刺', type: 'ATTACK', baseValue: 10, baseCost: 1, color: '#facc15', baseFxType: 'THUNDER',
    description: '迅捷的雷电攻击。',
    upgradeOptions: {
      POWER: { id: 'u3_p', type: 'POWER', name: '雷神之锤', description: '伤害巨幅提升', valueMod: 15, costMod: 1, newFxType: 'THUNDER' },
      SPEED: { id: 'u3_s', type: 'SPEED', name: '闪电链', description: '抽一张卡(未实装)', valueMod: 0, costMod: 0, newFxType: 'THUNDER' },
      SPECIAL: { id: 'u3_x', type: 'SPECIAL', name: '等离子光束', description: '无视护盾直接造成真实伤害', valueMod: 5, costMod: 1, newFxType: 'LASER' }
    }
  } as Card,
  { 
    id: 'c4', name: '共鸣充能', type: 'SKILL', baseValue: 0, baseCost: 1, color: '#10b981', baseFxType: 'BUFF_AURA',
    description: '获得 1 点能量。',
    upgradeOptions: {
      POWER: { id: 'u4_p', type: 'POWER', name: '力量共鸣', description: '获得能量(未来版本加伤)', valueMod: 0, costMod: 0, newFxType: 'BUFF_AURA' },
      SPEED: { id: 'u4_s', type: 'SPEED', name: '极速超载', description: '获得 2 点能量', valueMod: 0, costMod: 0, newFxType: 'BUFF_AURA' },
      SPECIAL: { id: 'u4_x', type: 'SPECIAL', name: '星光治愈', description: '获得能量并恢复生命', valueMod: 15, costMod: 1, newFxType: 'HEAL' }
    }
  } as Card,
  { 
    id: 'c5', name: '彗星冲击', type: 'ATTACK', baseValue: 25, baseCost: 2, color: '#e94560', baseFxType: 'EXPLOSION',
    description: '造成大量伤害。',
    upgradeOptions: {
      POWER: { id: 'u5_p', type: 'POWER', name: '陨石天降', description: '伤害极大化，费用+1', valueMod: 25, costMod: 1, newFxType: 'EXPLOSION' },
      SPEED: { id: 'u5_s', type: 'SPEED', name: '流星雨', description: '费用-1，伤害减半', valueMod: -12, costMod: -1, newFxType: 'DOUBLE_SLASH' },
      SPECIAL: { id: 'u5_x', type: 'SPECIAL', name: '聚变打击', description: '斩杀效果(低于30血直接击败)', valueMod: 0, costMod: 1, newFxType: 'LASER' }
    }
  } as Card,
];

const CHARACTERS_POOL: Character[] = [
  { id: 'ch1', name: '露娜', rarity: 'SSR', element: 'Wind', avatarColor: 'from-cyan-400 to-blue-500' },
  { id: 'ch2', name: '伊格尼斯', rarity: 'SR', element: 'Fire', avatarColor: 'from-orange-400 to-red-500' },
  { id: 'ch3', name: '阿库娅', rarity: 'R', element: 'Water', avatarColor: 'from-blue-400 to-indigo-500' },
];

// --- Helpers ---

const getCardStats = (card: Card) => {
  let val = card.baseValue;
  let cost = card.baseCost;
  let fx = card.baseFxType;
  let desc = card.description;
  let name = card.name;

  if (card.currentPath && card.upgradeOptions[card.currentPath]) {
    const upgrade = card.upgradeOptions[card.currentPath]!;
    val += upgrade.valueMod;
    cost = Math.max(0, cost + upgrade.costMod);
    if (upgrade.newFxType) fx = upgrade.newFxType;
    desc = upgrade.description;
    name = upgrade.name;
  }
  return { val, cost, fx, desc, name };
};

// --- Components ---

const Button = ({ onClick, children, className = '', variant = 'primary', disabled = false }: any) => {
  const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:brightness-110",
    secondary: "bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700",
    outline: "border-2 border-pink-500 text-pink-400 hover:bg-pink-500/10",
    danger: "bg-gradient-to-r from-red-600 to-red-800 text-white hover:brightness-110"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      {children}
    </button>
  );
};

const CardComponent: React.FC<{ card: Card; onClick?: () => void; disabled?: boolean; showUpgrade?: boolean }> = ({ card, onClick, disabled, showUpgrade }) => {
  const { val, cost, fx, desc, name } = getCardStats(card);
  
  return (
    <div 
      onClick={() => !disabled && onClick && onClick()}
      className={`
        relative w-32 h-48 rounded-xl p-3 flex flex-col justify-between transition-all duration-300 transform 
        ${disabled ? 'opacity-50 grayscale cursor-not-allowed scale-95' : 'hover:-translate-y-4 hover:shadow-2xl hover:shadow-pink-500/20 cursor-pointer'}
        ${card.currentPath === 'POWER' ? 'bg-red-900/40' : card.currentPath === 'SPEED' ? 'bg-blue-900/40' : card.currentPath === 'SPECIAL' ? 'bg-yellow-900/40' : 'bg-gray-900'}
        border-2
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
        
        {/* Upgrade Icon Overlay */}
        {card.currentPath && (
           <div className="absolute -bottom-2 -right-2 bg-black/80 rounded-full p-1 border border-white/20">
             {card.currentPath === 'POWER' && <Flame size={12} className="text-red-500"/>}
             {card.currentPath === 'SPEED' && <Zap size={12} className="text-blue-500"/>}
             {card.currentPath === 'SPECIAL' && <Star size={12} className="text-yellow-500"/>}
           </div>
        )}
      </div>
      <div className="text-center">
        <div className={`font-bold text-sm text-white mb-1 ${card.currentPath ? 'text-yellow-200' : ''}`}>{name}</div>
        <div className="text-[10px] text-gray-400 leading-tight">{desc}</div>
      </div>
    </div>
  );
};

const CharacterCard: React.FC<{ char: Character }> = ({ char }) => (
  <div className={`w-48 h-72 rounded-xl relative overflow-hidden flex flex-col shadow-2xl bg-gradient-to-b ${char.avatarColor} border-2 border-white/30 transform hover:scale-105 transition-transform`}>
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay"></div>
    <div className="p-4 flex justify-between items-start z-10">
      <div className="bg-black/40 px-2 py-1 rounded text-xs font-mono text-white backdrop-blur-md border border-white/10">
        {ELEMENT_MAP[char.element]}
      </div>
      <div className={`font-black text-2xl italic ${char.rarity === 'SSR' ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]' : char.rarity === 'SR' ? 'text-purple-300' : 'text-blue-200'}`}>
        {char.rarity}
      </div>
    </div>
    
    <div className="flex-1 flex items-center justify-center z-10">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
         <User size={56} className="text-white filter drop-shadow-lg" />
      </div>
    </div>

    <div className="p-4 bg-gradient-to-t from-black/80 to-transparent z-10 pt-12">
      <h3 className="text-2xl font-bold text-white text-center mb-1">{char.name}</h3>
      <div className="h-0.5 w-1/2 bg-white/50 mx-auto mb-2"></div>
      <p className="text-center text-xs text-gray-300">战斗单位 - {char.id.toUpperCase()}</p>
    </div>
  </div>
);

// --- VFX Component ---
const EffectLayer = ({ effects }: { effects: VisualEffect[] }) => {
  if (effects.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-visible">
      {effects.map((fx) => (
        <div key={fx.id} className="absolute inset-0 flex items-center justify-center">
          
          {/* SLASH & DOUBLE SLASH */}
          {(fx.type === 'SLASH' || fx.type === 'DOUBLE_SLASH') && (
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
              {/* Container rotated for angle */}
              <div className="absolute w-full h-full flex items-center justify-center rotate-[-35deg]">

                {/* 1. Fast Trajectory Line (The Sword Qi) - Brighter and faster */}
                <div className="absolute w-[120%] h-[3px] bg-cyan-50 shadow-[0_0_30px_rgba(255,255,255,1)] animate-slash-fast-trace z-40" />

                {/* 2. The Wide Energy Wave (Visual bulk) */}
                <div className="absolute w-[150%] h-32 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 animate-slash-fast-whoosh mix-blend-screen z-30 transform -skew-x-12" />

                {/* 3. Target Afterimage (The cut mark) - Lingers slightly */}
                <div className="absolute w-48 h-1 bg-white animate-slash-impact opacity-0 z-50 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />
                
                {/* 4. Screen Flash */}
                <div className="absolute inset-0 bg-cyan-400/20 animate-flash-short mix-blend-overlay" />

                {/* Second Slash for DOUBLE_SLASH */}
                {fx.type === 'DOUBLE_SLASH' && (
                  <div className="absolute inset-0 flex items-center justify-center rotate-[70deg] delay-100">
                      <div className="absolute w-[120%] h-[3px] bg-red-100 shadow-[0_0_30px_rgba(255,100,100,1)] animate-slash-fast-trace z-40 delay-100" />
                      <div className="absolute w-[150%] h-32 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-0 animate-slash-fast-whoosh mix-blend-screen z-30 transform -skew-x-12 delay-100" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXPLOSION */}
          {fx.type === 'EXPLOSION' && (
            <div className="relative w-full h-full flex items-center justify-center">
               {/* 1. Instant White Flash Center - High intensity */}
               <div className="absolute w-2 h-2 bg-white rounded-full animate-explosion-flash z-50 shadow-[0_0_80px_rgba(255,255,255,1)]" />

               {/* 2. Expanding Shockwave Ring (Orange) - Fast linear expansion */}
               <div className="absolute w-10 h-10 border-4 border-orange-500 rounded-full animate-explosion-ring opacity-0 z-40" />

               {/* 3. Wide Halo (Yellow) - Slower bloom */}
               <div className="absolute w-10 h-10 border-[20px] border-yellow-200/40 rounded-full animate-explosion-halo opacity-0 z-30" />

               {/* 4. Fireball Core */}
               <div className="absolute w-32 h-32 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-300 rounded-full animate-explosion-expand opacity-90 mix-blend-screen" />
               
               {/* 5. Screen Tint */}
               <div className="absolute inset-0 bg-orange-100/30 animate-flash-instant mix-blend-overlay" />
            </div>
          )}

          {/* THUNDER */}
          {fx.type === 'THUNDER' && (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-yellow-100/30 animate-flash-short mix-blend-overlay" />
               <Zap className="text-yellow-300 absolute top-0 w-32 h-[120%] animate-thunder-strike filter drop-shadow-[0_0_20px_rgba(253,224,71,0.8)]" strokeWidth={1} fill="currentColor" />
               <Zap className="text-white absolute top-0 w-16 h-[120%] animate-thunder-strike delay-75 filter drop-shadow-[0_0_10px_white]" strokeWidth={2} />
            </div>
          )}

          {/* LASER */}
          {fx.type === 'LASER' && (
             <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute h-4 w-full bg-cyan-400 blur-md animate-laser-beam mix-blend-screen origin-left" />
                <div className="absolute h-1 w-full bg-white animate-laser-beam origin-left" />
                <div className="absolute inset-0 bg-cyan-500/20 animate-flash-short" />
             </div>
          )}

          {/* ICE_NOVA */}
          {fx.type === 'ICE_NOVA' && (
             <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-200/20 animate-flash-instant" />
                <Snowflake size={128} className="text-blue-100 animate-ice-shatter filter drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                <div className="absolute w-full h-full border-4 border-blue-200 rounded-full animate-shockwave" />
             </div>
          )}

          {/* BUFF_AURA */}
          {fx.type === 'BUFF_AURA' && (
             <div className="relative w-full h-full flex items-center justify-center">
                 <div className="absolute w-32 h-32 border-2 border-yellow-300 rounded-full animate-spin-slow opacity-50" style={{ borderStyle: 'dashed' }} />
                 <div className="absolute w-24 h-24 bg-yellow-500/20 rounded-full animate-pulse-fade" />
                 <ArrowUpCircle size={48} className="text-yellow-300 animate-float-up-1" />
             </div>
          )}

          {/* SHIELD */}
          {fx.type === 'SHIELD' && (
            <div className="relative w-full h-full flex items-center justify-center animate-shield-deploy">
               <div className="w-40 h-40 border-2 border-blue-400/60 bg-blue-600/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.5)] backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 2px, transparent 2px)', backgroundSize: '10px 10px' }}></div>
                  <Shield size={64} className="text-blue-100 z-10 animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" fill="currentColor" />
               </div>
               <div className="absolute w-48 h-48 border-t-2 border-b-2 border-cyan-300/40 rounded-full animate-spin-slow" />
            </div>
          )}

          {/* HEAL */}
          {fx.type === 'HEAL' && (
            <div className="relative w-full h-full">
               <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-float-up-1 text-green-400 filter drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
                  <Heart size={40} fill="currentColor" />
               </div>
               <div className="absolute bottom-8 right-1/3 animate-float-up-3 text-emerald-200 font-bold font-mono text-xl shadow-black drop-shadow-md">+HP</div>
               <div className="absolute inset-0 bg-green-500/10 animate-pulse-fade rounded-xl" />
            </div>
          )}

          {/* HIT */}
          {fx.type === 'HIT' && (
             <div className="absolute inset-0 bg-red-600/40 animate-flash-hit rounded-xl mix-blend-overlay" />
          )}
        </div>
      ))}
    </div>
  );
};


// --- Main App ---

const App = () => {
  const [screen, setScreen] = useState<GameScreen>('MENU');
  
  // Player Data
  const [deck, setDeck] = useState<Card[]>([]);
  const [upgradePoints, setUpgradePoints] = useState(0); // Currency for upgrades

  // Battle State
  const [playerHp, setPlayerHp] = useState(INITIAL_PLAYER_HP);
  const [enemyHp, setEnemyHp] = useState(INITIAL_ENEMY_HP);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyShield, setEnemyShield] = useState(0); // New: Enemy Shield
  const [enemyFrozen, setEnemyFrozen] = useState(false); // New: Enemy Frozen Status
  
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [hand, setHand] = useState<Card[]>([]);
  const [turn, setTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
  const [battleLog, setBattleLog] = useState<string[]>([]);
  
  // VFX State
  const [activeEffects, setActiveEffects] = useState<VisualEffect[]>([]);
  
  // Gacha State
  const [lastPulledChar, setLastPulledChar] = useState<Character | null>(null);

  // Reward State
  const [rewardCard, setRewardCard] = useState<Card | null>(null);

  // Deck Management State
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // FX
  const [shake, setShake] = useState(false);

  // --- Init ---
  useEffect(() => {
    // Init starter deck
    const starterDeck = [
      createCard(CARD_TEMPLATES[0]), // Slash
      createCard(CARD_TEMPLATES[0]),
      createCard(CARD_TEMPLATES[1]), // Shield
      createCard(CARD_TEMPLATES[1]),
      createCard(CARD_TEMPLATES[2]), // Thunder
      createCard(CARD_TEMPLATES[3]), // Buff
    ];
    setDeck(starterDeck);
  }, []);

  // --- Helpers ---
  const getRandomCards = (count: number) => {
    if (deck.length === 0) return [];
    return Array.from({ length: count }, () => deck[Math.floor(Math.random() * deck.length)]);
  };

  const addLog = (msg: string) => {
    setBattleLog(prev => [msg, ...prev].slice(0, 3));
  };

  const triggerEffect = (type: VisualEffectType, target: 'PLAYER' | 'ENEMY') => {
    const id = Date.now() + Math.random();
    setActiveEffects(prev => [...prev, { id, type, target }]);
    setTimeout(() => {
        setActiveEffects(prev => prev.filter(e => e.id !== id));
    }, 1200);
  };

  // --- Upgrade Logic ---
  const handleUpgrade = (cardUid: string, path: UpgradePathType) => {
    if (upgradePoints < 1) return; // Check cost

    setUpgradePoints(prev => prev - 1);
    setDeck(prev => prev.map(c => {
      if (c.uid === cardUid) {
        return { ...c, currentPath: path, level: 2 };
      }
      return c;
    }));
    setSelectedCardId(null); // Close modal
  };

  // --- Battle Logic ---

  const startBattle = () => {
    setPlayerHp(INITIAL_PLAYER_HP);
    setEnemyHp(INITIAL_ENEMY_HP);
    setPlayerShield(0);
    setEnemyShield(0);
    setEnemyFrozen(false);
    setEnergy(MAX_ENERGY);
    setHand(getRandomCards(3));
    setTurn('PLAYER');
    setBattleLog(['战斗开始！']);
    setScreen('BATTLE');
    setActiveEffects([]);
  };

  const playCard = async (card: Card) => {
    if (turn !== 'PLAYER' || energy < getCardStats(card).cost) return;
    
    const stats = getCardStats(card);
    
    // Player Action
    addLog(`你使用了 ${stats.name}！`);
    setEnergy(prev => prev - stats.cost);
    
    // -- ATTACK LOGIC --
    if (card.type === 'ATTACK') {
      let damage = stats.val;
      let isTrueDamage = false;

      // Special: Double Slash (c1)
      if (card.currentPath === 'SPECIAL' && card.id === 'c1') {
         damage = Math.floor(damage * 2);
         addLog("双星连斩！200%伤害");
      }

      // Special: Execute (c5)
      if (card.currentPath === 'SPECIAL' && card.id === 'c5') {
         if (enemyHp < 30) {
            damage = 999;
            addLog("聚变打击！斩杀！");
            triggerEffect('EXPLOSION', 'ENEMY'); // Extra Boom
         }
      }

      // Special: Pierce (c3)
      if (card.currentPath === 'SPECIAL' && card.id === 'c3') {
         isTrueDamage = true;
         addLog("等离子光束！无视护盾");
      }

      // Apply Damage vs Shield
      let actualDmg = damage;
      if (!isTrueDamage && enemyShield > 0) {
         if (enemyShield >= damage) {
            setEnemyShield(prev => prev - damage);
            actualDmg = 0;
            addLog("护盾抵挡了攻击");
         } else {
            actualDmg = damage - enemyShield;
            setEnemyShield(0);
         }
      } else if (isTrueDamage && enemyShield > 0) {
        // Visual effect of breaking shield maybe?
      }

      if (actualDmg > 0) {
        setEnemyHp(prev => prev - actualDmg);
        setShake(true);
        setTimeout(() => setShake(false), 300);
      }
      
      triggerEffect(stats.fx, 'ENEMY');
    } 
    // -- DEFEND LOGIC --
    else if (card.type === 'DEFEND') {
      setPlayerShield(prev => prev + stats.val);
      triggerEffect(stats.fx, 'PLAYER');
      
      // Special: Freeze (c2)
      if (card.currentPath === 'SPECIAL' && card.id === 'c2') {
        setEnemyFrozen(true);
        addLog("寒气侵袭！敌人被冻结");
        triggerEffect('ICE_NOVA', 'ENEMY');
      }
    } 
    // -- SKILL LOGIC --
    else if (card.type === 'SKILL') {
       // Special: Heal + Energy (c4)
       if (card.id === 'c4' && card.currentPath === 'SPECIAL') {
           setPlayerHp(prev => Math.min(prev + stats.val, INITIAL_PLAYER_HP));
           setEnergy(prev => Math.min(prev + 1, 5));
           triggerEffect('HEAL', 'PLAYER');
       }
       else if (stats.fx === 'HEAL') {
         setPlayerHp(prev => Math.min(prev + stats.val, INITIAL_PLAYER_HP));
         triggerEffect('HEAL', 'PLAYER');
       } 
       else if (stats.fx === 'BUFF_AURA') {
         let energyGain = 1;
         if (card.currentPath === 'SPEED' && card.id === 'c4') energyGain = 2; // Overload
         
         setEnergy(prev => Math.min(prev + energyGain, 5));
         triggerEffect('BUFF_AURA', 'PLAYER');
         
         if (card.currentPath === 'SPEED' && card.id === 'c4') {
            setPlayerHp(prev => prev - 5); // Cost life
            addLog("过载！受到反噬伤害");
         }
      }
    }

    // Check Win (Early check)
    if (enemyHp <= 0) { // Note: state update is async, this checks old value mostly, but good for instant kills
      // Effect might execute next render loop properly
    }

    setHand(prev => prev.filter(c => c.uid !== card.uid)); // Remove played card instance
    
    // Simple turn switch
    setTurn('ENEMY');
  };

  // Check Win/Loss Effect
  useEffect(() => {
     if (enemyHp <= 0 && screen === 'BATTLE') {
        // Generate Reward
        const randomTemplate = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
        setRewardCard(createCard(randomTemplate));
        
        setTimeout(() => setScreen('REWARD'), 800);
     }
     if (playerHp <= 0 && screen === 'BATTLE') {
         setTimeout(() => setScreen('DEFEAT'), 800);
     }
  }, [enemyHp, playerHp, screen]);

  // Enemy Turn AI
  useEffect(() => {
    if (turn === 'ENEMY' && screen === 'BATTLE' && enemyHp > 0) {
      const timer = setTimeout(() => {
        
        // Frozen Check
        if (enemyFrozen) {
             addLog("敌人处于冻结状态！跳过回合");
             triggerEffect('ICE_NOVA', 'ENEMY'); // Visual reminder
             setEnemyFrozen(false);
             
             // End Turn
             setTurn('PLAYER');
             setEnergy(MAX_ENERGY);
             setHand(getRandomCards(3));
             setPlayerShield(0);
             return;
        }

        // Simple AI: 70% Attack, 30% Defend
        const action = Math.random() > 0.3 ? 'ATTACK' : 'DEFEND';
        
        if (action === 'ATTACK') {
          const dmg = 12;
          triggerEffect('SLASH', 'PLAYER'); // Enemy visual attack
          triggerEffect('HIT', 'PLAYER');

          let actualDmg = dmg;
          
          if (playerShield > 0) {
            if (playerShield >= dmg) {
              setPlayerShield(prev => prev - dmg);
              actualDmg = 0;
            } else {
              actualDmg = dmg - playerShield;
              setPlayerShield(0);
            }
          }
          
          if (actualDmg > 0) {
            setPlayerHp(prev => prev - actualDmg);
          }
          addLog(`敌人造成了 ${dmg} 点伤害！`);
        } else {
          // Defend Logic
          const shieldGain = 10;
          setEnemyShield(prev => prev + shieldGain);
          triggerEffect('SHIELD', 'ENEMY');
          addLog(`敌人强化了防御，护盾+${shieldGain}`);
        }

        // End Enemy Turn
        setTurn('PLAYER');
        setHand(getRandomCards(3));
        setPlayerShield(0); // Player Shields expire
        setEnergy(MAX_ENERGY);

      }, 1500); // Delay for dramatic effect

      return () => clearTimeout(timer);
    }
  }, [turn, screen, playerHp, playerShield, enemyFrozen, enemyHp]);

  // --- Gacha Logic ---
  const pullGacha = () => {
    const char = CHARACTERS_POOL[Math.floor(Math.random() * CHARACTERS_POOL.length)];
    const cardTemplate = CARD_TEMPLATES[Math.floor(Math.random() * CARD_TEMPLATES.length)];
    setDeck(prev => [...prev, createCard(cardTemplate)]); // Add new card to deck
    setLastPulledChar(char);
  };

  // --- Reward Logic ---
  const claimReward = (choice: 'CARD' | 'POINT') => {
      if (choice === 'CARD' && rewardCard) {
          setDeck(prev => [...prev, rewardCard]);
      } else if (choice === 'POINT') {
          setUpgradePoints(prev => prev + 1);
      }
      setScreen('VICTORY');
  };

  // --- Renders ---

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
        ver 1.1.0 | Deck: {deck.length} Cards
      </div>
    </div>
  );

  const renderDeckScreen = () => {
    const selectedCard = deck.find(c => c.uid === selectedCardId);

    return (
      <div className="flex flex-col h-full bg-[#0f0f1a] relative z-20">
        <div className="p-4 flex items-center justify-between border-b border-gray-700 bg-gray-900/80 backdrop-blur">
          <Button onClick={() => setScreen('MENU')} variant="outline" className="py-2 px-4 text-sm">返回</Button>
          <div className="flex flex-col items-center">
             <h2 className="text-xl font-bold text-white">卡组管理 ({deck.length})</h2>
             <div className="text-xs text-yellow-400 font-bold flex items-center gap-1">
                 <Star size={12} fill="currentColor" />
                 可用升级点数: {upgradePoints}
             </div>
          </div>
          <div className="w-16"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-4 gap-4 pb-32">
          {deck.map(card => (
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
              
              <div className="flex justify-between items-start">
                 <h3 className="text-2xl font-bold text-white">卡牌改造: {selectedCard.name}</h3>
                 <button onClick={() => setSelectedCardId(null)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Current Card */}
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm text-gray-400">当前状态</div>
                  <CardComponent card={selectedCard} disabled />
                </div>

                <div className="text-gray-500 hidden md:block"><ChevronRight size={32}/></div>

                {/* Upgrade Options */}
                {selectedCard.currentPath === null ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    {/* Power Path */}
                    <div className={`bg-red-900/20 border ${upgradePoints > 0 ? 'border-red-500/30 hover:bg-red-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'POWER')}>
                       <div className="flex items-center gap-2 mb-2 text-red-400 font-bold"><Flame size={18}/> 强袭路线</div>
                       <h4 className="text-white font-bold text-lg mb-1">{selectedCard.upgradeOptions.POWER?.name}</h4>
                       <p className="text-xs text-gray-300 mb-2">{selectedCard.upgradeOptions.POWER?.description}</p>
                       <div className="text-xs text-red-300 font-mono">
                          {selectedCard.upgradeOptions.POWER?.valueMod > 0 && `伤害 +${selectedCard.upgradeOptions.POWER.valueMod} `}
                          {selectedCard.upgradeOptions.POWER?.costMod !== 0 && `费用 ${selectedCard.upgradeOptions.POWER.costMod > 0 ? '+' : ''}${selectedCard.upgradeOptions.POWER.costMod}`}
                       </div>
                       {upgradePoints === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white bg-black/60 rounded-xl">点数不足</div>}
                    </div>

                    {/* Speed Path */}
                    <div className={`bg-blue-900/20 border ${upgradePoints > 0 ? 'border-blue-500/30 hover:bg-blue-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'SPEED')}>
                       <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold"><Zap size={18}/> 急速路线</div>
                       <h4 className="text-white font-bold text-lg mb-1">{selectedCard.upgradeOptions.SPEED?.name}</h4>
                       <p className="text-xs text-gray-300 mb-2">{selectedCard.upgradeOptions.SPEED?.description}</p>
                       <div className="text-xs text-blue-300 font-mono">
                          {selectedCard.upgradeOptions.SPEED?.costMod !== 0 && `费用 ${selectedCard.upgradeOptions.SPEED.costMod} `}
                          {selectedCard.upgradeOptions.SPEED?.valueMod !== 0 && `数值 ${selectedCard.upgradeOptions.SPEED.valueMod}`}
                       </div>
                       {upgradePoints === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white bg-black/60 rounded-xl">点数不足</div>}
                    </div>

                    {/* Special Path */}
                    <div className={`bg-yellow-900/20 border ${upgradePoints > 0 ? 'border-yellow-500/30 hover:bg-yellow-900/40 cursor-pointer' : 'border-gray-700 grayscale opacity-50 cursor-not-allowed'} rounded-xl p-4 transition-colors group relative`}
                         onClick={() => handleUpgrade(selectedCard.uid, 'SPECIAL')}>
                       <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold"><Star size={18}/> 觉醒路线</div>
                       <h4 className="text-white font-bold text-lg mb-1">{selectedCard.upgradeOptions.SPECIAL?.name}</h4>
                       <p className="text-xs text-gray-300 mb-2">{selectedCard.upgradeOptions.SPECIAL?.description}</p>
                       <div className="text-xs text-yellow-300 font-mono">特殊效果变更</div>
                       {upgradePoints === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white bg-black/60 rounded-xl">点数不足</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-gray-700 rounded-xl bg-gray-800/50">
                    <div className="text-yellow-400 mb-2"><Star size={32} /></div>
                    <div className="text-white font-bold text-lg">已改造完毕</div>
                    <div className="text-gray-400 text-sm">该卡牌已达到最大潜能。</div>
                  </div>
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
          <span>{turn === 'PLAYER' ? '我方回合' : '敌方回合'}</span>
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
        <div className="relative z-10 w-full max-w-2xl flex justify-between items-end px-8 pb-32 h-full">
          
          {/* Player */}
          <div className="flex flex-col items-center gap-2 transition-all duration-500">
            <div className="relative">
               {/* VFX Layer for Player */}
               <EffectLayer effects={activeEffects.filter(e => e.target === 'PLAYER')} />
               
               <div className="w-32 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] flex items-center justify-center relative overflow-hidden group">
                  <User size={64} className="text-white/80" />
                  {/* Shield Overlay */}
                  {playerShield > 0 && (
                    <div className="absolute inset-0 border-4 border-blue-400 rounded-xl animate-pulse bg-blue-500/20 flex items-center justify-center">
                      <Shield className="text-blue-400" size={24} />
                      <span className="font-bold text-blue-100">{playerShield}</span>
                    </div>
                  )}
                  {/* Hit FX */}
                  {playerHp < INITIAL_PLAYER_HP && (
                    <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
                  )}
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
               {/* VFX Layer for Enemy */}
               <EffectLayer effects={activeEffects.filter(e => e.target === 'ENEMY')} />

               <div className={`w-32 h-48 bg-gradient-to-br from-red-900 to-gray-800 rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center border-2 ${enemyFrozen ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-red-500/30'}`}>
                  {enemyFrozen ? (
                      <Snowflake size={64} className="text-blue-200 animate-pulse" />
                  ) : (
                      <span className="text-6xl filter drop-shadow-lg">👾</span>
                  )}
                  
                  {/* Enemy Shield Overlay */}
                  {enemyShield > 0 && (
                    <div className="absolute inset-0 border-4 border-gray-400 rounded-xl bg-gray-500/20 flex items-center justify-center z-10">
                      <Shield className="text-gray-300" size={24} />
                      <span className="font-bold text-white ml-1">{enemyShield}</span>
                    </div>
                  )}
               </div>
            </div>
            {/* Enemy Stats */}
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

      {/* Cards UI */}
      <div className="h-64 bg-gray-900/90 border-t border-gray-700 relative z-30 p-4 flex flex-col items-center">
        <div className="flex justify-between w-full max-w-lg mb-2 px-4">
          <div className="text-xs text-gray-400 font-mono">
            能量 <span className="text-yellow-400 font-bold ml-1">{"⚡".repeat(energy)}</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
             牌库: {Math.max(0, deck.length - hand.length)}
          </div>
        </div>
        
        {turn === 'PLAYER' ? (
          <div className="flex gap-4 items-end justify-center h-full pb-4">
            {hand.map(card => (
              <CardComponent 
                key={card.uid} 
                card={card} 
                disabled={energy < getCardStats(card).cost}
                onClick={() => playCard(card)} 
              />
            ))}
            {hand.length === 0 && (
               <div className="text-gray-500 animate-pulse">等待下一回合...</div>
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

  const renderGacha = () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e] relative overflow-hidden">
        <div className="absolute top-4 left-4 z-20">
             <Button onClick={() => setScreen('MENU')} variant="outline">返回</Button>
        </div>

        {!lastPulledChar ? (
            <div className="text-center z-10 space-y-8 animate-fade-in">
                <h2 className="text-3xl font-bold text-white mb-8">回响共鸣</h2>
                <div className="w-64 h-64 rounded-full border-4 border-pink-500/30 flex items-center justify-center animate-spin-slow">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 blur-xl opacity-50 absolute"></div>
                    <Sparkles size={64} className="text-white relative z-10" />
                </div>
                <Button onClick={pullGacha} variant="primary" className="mx-auto w-48 text-lg">
                    连接开始 (1x)
                </Button>
                <p className="text-gray-500 text-sm">每次连接将获得一张新卡牌和角色碎片</p>
            </div>
        ) : (
            <div className="flex flex-col items-center z-10 animate-fade-in-up">
                 <div className="mb-4">
                    <CharacterCard char={lastPulledChar} />
                 </div>
                 <div className="text-center mb-8">
                    <div className="text-white font-bold text-xl">获得新卡牌！</div>
                    <div className="text-cyan-400 text-sm">{deck[deck.length-1]?.name}</div>
                 </div>
                 <div className="flex gap-4">
                    <Button onClick={() => setLastPulledChar(null)} variant="secondary">跳过</Button>
                    <Button onClick={pullGacha} variant="primary">再次召唤</Button>
                 </div>
            </div>
        )}
    </div>
  );

  const renderRewardScreen = () => {
    if (!rewardCard) return null;

    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/90 z-50 animate-fade-in relative">
        <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-yellow-400 mb-2 tracking-tighter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                战斗胜利
            </h1>
            <p className="text-gray-300 font-mono text-sm">CHOOSE YOUR REWARD</p>
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-center justify-center w-full max-w-4xl px-4">
            
            {/* Option A: Card */}
            <div className="flex flex-col items-center gap-6 group">
                <div className="relative transform transition-all duration-300 group-hover:-translate-y-4 group-hover:scale-105">
                     <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600/80 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm border border-blue-400/30">
                        战术芯片
                     </div>
                     <CardComponent card={rewardCard} />
                     <div className="absolute inset-0 border-2 border-blue-400/0 group-hover:border-blue-400/50 rounded-xl transition-all" />
                </div>
                <Button onClick={() => claimReward('CARD')} variant="primary" className="w-48">
                    获取卡牌
                </Button>
            </div>

            <div className="text-2xl font-black text-gray-600 italic">OR</div>

            {/* Option B: Upgrade Point */}
            <div className="flex flex-col items-center gap-6 group">
                 <div className="relative transform transition-all duration-300 group-hover:-translate-y-4 group-hover:scale-105">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-600/80 px-3 py-1 rounded-full text-xs font-bold text-white backdrop-blur-sm border border-yellow-400/30">
                        改造点数
                     </div>
                    <div className="w-32 h-48 rounded-xl bg-gradient-to-br from-yellow-900 to-orange-900 border-2 border-yellow-500/30 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <Star size={48} className="text-yellow-400 mb-2 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse" fill="currentColor" />
                        <div className="text-2xl font-bold text-white">+1</div>
                        <div className="text-xs text-yellow-200 mt-1">Upgrade Point</div>
                    </div>
                </div>
                <Button onClick={() => claimReward('POINT')} variant="primary" className="w-48 bg-gradient-to-r from-yellow-500 to-orange-600">
                    获取点数
                </Button>
            </div>
        </div>
      </div>
    );
  }

  const renderEndScreen = (win: boolean) => (
    <div className="flex flex-col items-center justify-center h-full bg-black/90 z-50 animate-fade-in">
      <h1 className={`text-6xl font-black mb-4 ${win ? 'text-yellow-400' : 'text-red-600'} tracking-tighter`}>
        {win ? '任务完成' : '信号丢失'}
      </h1>
      <p className="text-gray-400 mb-8 font-mono">{win ? '奖励已发放' : '正在启动修复程序...'}</p>
      <Button onClick={() => setScreen('MENU')} variant="outline">
        返回基地
      </Button>
    </div>
  );

  return (
    <div className="w-full h-screen bg-[#0f0f1a] text-white font-sans overflow-hidden select-none">
      {screen === 'MENU' && renderMenu()}
      {screen === 'DECK' && renderDeckScreen()}
      {screen === 'BATTLE' && renderBattle()}
      {screen === 'GACHA' && renderGacha()}
      {screen === 'REWARD' && renderRewardScreen()}
      {(screen === 'VICTORY' || screen === 'DEFEAT') && renderEndScreen(screen === 'VICTORY')}
      
      {/* Overlay Noise/Scanlines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] z-[100]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
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
  
  /* SLASH ANIMATIONS - REFINED */
  @keyframes slash-fast-whoosh {
    0% { transform: translateX(-50%) scaleX(0.5); opacity: 0; }
    20% { opacity: 0.8; }
    100% { transform: translateX(50%) scaleX(1.5); opacity: 0; }
  }
  @keyframes slash-fast-trace {
    0% { width: 0%; opacity: 0; left: -20%; }
    10% { opacity: 1; }
    50% { width: 150%; left: 50%; transform: translateX(-50%); }
    100% { width: 0%; opacity: 0; left: 120%; }
  }
  @keyframes slash-impact {
    0% { opacity: 0; transform: scaleX(0.5) scaleY(0.2); }
    20% { opacity: 1; transform: scaleX(1) scaleY(1); }
    100% { opacity: 0; transform: scaleX(1.2) scaleY(0.1); filter: blur(4px); }
  }
  
  /* EXPLOSION ANIMATIONS - REFINED */
  @keyframes explosion-core {
    0% { transform: scale(0.1); opacity: 1; }
    50% { opacity: 1; }
    100% { transform: scale(3); opacity: 0; }
  }
  @keyframes explosion-expand {
    0% { transform: scale(0.2); opacity: 0.8; }
    100% { transform: scale(2); opacity: 0; }
  }
  @keyframes explosion-flash {
    0% { transform: scale(0); opacity: 1; }
    10% { transform: scale(3); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
  @keyframes explosion-ring {
    0% { transform: scale(0); opacity: 0; border-width: 8px; }
    10% { opacity: 1; }
    100% { transform: scale(3); opacity: 0; border-width: 0px; }
  }
  @keyframes explosion-halo {
    0% { transform: scale(0); opacity: 0; }
    30% { opacity: 0.6; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes shockwave {
    0% { transform: scale(0.5); opacity: 0; border-width: 4px; }
    20% { opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; border-width: 0px; }
  }
  @keyframes halo-burst {
    0% { transform: scale(0); opacity: 1; background-color: #fff; }
    30% { background-color: #fbbf24; opacity: 0.8; }
    100% { transform: scale(12); opacity: 0; background-color: #ef4444; }
  }
  @keyframes flash-instant {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
  
  /* SHIELD ANIMATIONS */
  @keyframes shield-deploy {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  /* HEAL ANIMATIONS */
  @keyframes float-up-1 {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    20% { opacity: 1; transform: translateY(-10px) scale(1.2); }
    100% { transform: translateY(-60px) scale(1); opacity: 0; }
  }
  @keyframes float-up-2 {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    40% { opacity: 1; transform: translateY(-15px) scale(1); }
    100% { transform: translateY(-50px) scale(0.5); opacity: 0; }
  }
  @keyframes float-up-3 {
    0% { transform: translateY(0); opacity: 0; }
    30% { opacity: 1; transform: translateY(-20px); }
    100% { transform: translateY(-70px); opacity: 0; }
  }
  @keyframes pulse-fade {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
  
  /* NEW VFX ANIMATIONS */
  @keyframes thunder-strike {
    0% { opacity: 0; transform: translateY(-100%) scaleX(0.5); }
    10% { opacity: 1; transform: translateY(0%) scaleX(1); }
    20% { opacity: 0.5; }
    30% { opacity: 1; }
    100% { opacity: 0; transform: scaleX(1.5); }
  }
  @keyframes laser-beam {
    0% { width: 0%; opacity: 0; }
    20% { width: 100%; opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes ice-shatter {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); opacity: 1; }
    70% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; filter: blur(4px); }
  }
  
  /* COMMON */
  @keyframes flash-short {
    0% { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @keyframes flash-hit {
    0% { opacity: 0.6; }
    100% { opacity: 0; }
  }

  .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
  .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
  .animate-spin-slow { animation: spin-slow 8s linear infinite; }
  
  .animate-slash-fast-whoosh { animation: slash-fast-whoosh 0.25s cubic-bezier(0, 0.5, 0.5, 1) forwards; }
  .animate-slash-fast-trace { animation: slash-fast-trace 0.3s ease-out forwards; }
  .animate-slash-impact { animation: slash-impact 0.4s ease-out forwards; }
  
  .animate-explosion-core { animation: explosion-core 0.4s ease-out forwards; }
  .animate-explosion-expand { animation: explosion-expand 0.5s ease-out forwards; }
  .animate-explosion-flash { animation: explosion-flash 0.3s ease-out forwards; }
  .animate-explosion-ring { animation: explosion-ring 0.4s ease-out forwards; }
  .animate-explosion-halo { animation: explosion-halo 0.5s ease-out forwards; }
  
  .animate-shockwave { animation: shockwave 0.5s ease-out forwards; }
  .animate-halo-burst { animation: halo-burst 0.4s ease-out forwards; }
  .animate-flash-instant { animation: flash-instant 0.2s ease-out forwards; }
  
  .animate-shield-deploy { animation: shield-deploy 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  
  .animate-float-up-1 { animation: float-up-1 1s ease-out forwards; }
  .animate-float-up-2 { animation: float-up-2 1.2s ease-out 0.1s forwards; }
  .animate-float-up-3 { animation: float-up-3 1.1s ease-out 0.2s forwards; }
  .animate-pulse-fade { animation: pulse-fade 0.8s ease-out forwards; }
  
  .animate-flash-short { animation: flash-short 0.15s ease-out forwards; }
  .animate-flash-hit { animation: flash-hit 0.2s ease-out forwards; }
  
  .animate-thunder-strike { animation: thunder-strike 0.3s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
  .animate-laser-beam { animation: laser-beam 0.5s ease-out forwards; }
  .animate-ice-shatter { animation: ice-shatter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
`;
document.head.appendChild(style);