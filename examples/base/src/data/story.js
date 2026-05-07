// Base character-only dataset. Replace this file for each cast.

export const TYPE_META = {
  character: { label: "角色", icon: "👤", size: 42, depth: -8 },
};

const nodes = [
  {
    id: "root",
    label: "中心角色",
    type: "character",
    zone: "character",
    importance: 100,
    group: "core",
    aliases: ["主角"],
    description: "角色关系网的中心人物，连接最重要的亲友、竞争者与敌对者。替换为用户故事中最适合作为浏览入口的角色。",
  },
  {
    id: "closest-ally",
    label: "亲密同伴",
    type: "character",
    zone: "character",
    importance: 86,
    group: "support",
    aliases: ["同伴"],
    description: "与中心角色关系最稳定的支持者，常承担陪伴、保护或提醒作用，是理解中心人物情感面的关键角色。",
  },
  {
    id: "rival",
    label: "竞争对手",
    type: "character",
    zone: "character",
    importance: 84,
    group: "conflict",
    aliases: ["对手"],
    description: "与中心角色形成目标或性格上的竞争关系，既制造冲突，也迫使双方成长，是关系网中的张力来源。",
  },
  {
    id: "mentor",
    label: "导师角色",
    type: "character",
    zone: "character",
    importance: 76,
    group: "support",
    aliases: ["老师"],
    description: "给予中心角色经验、训练或价值判断的人物，其影响通常决定主角如何理解责任、力量与选择。",
  },
  {
    id: "enemy",
    label: "敌对角色",
    type: "character",
    zone: "character",
    importance: 82,
    group: "conflict",
    aliases: ["敌人"],
    description: "与中心角色存在直接敌意或利益冲突的人物，推动关系网从日常连接转向危机和对抗。",
  },
  {
    id: "protector",
    label: "守护者",
    type: "character",
    zone: "character",
    importance: 70,
    group: "support",
    aliases: ["保护者"],
    description: "在关键时刻保护或替中心角色承担风险的人物，常让关系呈现责任、牺牲与亏欠的复杂层次。",
  },
  {
    id: "dependent",
    label: "被守护者",
    type: "character",
    zone: "character",
    importance: 66,
    group: "support",
    aliases: ["需要保护的人"],
    description: "需要中心角色关照、拯救或理解的人物，其处境会放大中心角色的责任感与行动动机。",
  },
  {
    id: "observer",
    label: "旁观知情者",
    type: "character",
    zone: "character",
    importance: 58,
    group: "neutral",
    aliases: ["知情者"],
    description: "不一定直接参与冲突，却了解多方关系和秘密的人物，可帮助用户从旁侧理解人物网络。",
  },
];

const edges = [
  { source: "root", target: "closest-ally", label: "信任/并肩", relation: "character-character" },
  {
    source: "root",
    target: "rival",
    label: "竞争/互相刺激",
    relation: "character-character",
    perspectives: [
      { from: "root", to: "rival", label: "必须超越或说服的对象" },
      { from: "rival", to: "root", label: "证明自身价值的参照" },
    ],
  },
  { source: "root", target: "mentor", label: "指导/影响", relation: "character-character" },
  { source: "root", target: "enemy", label: "直接敌对", relation: "character-character" },
  { source: "root", target: "protector", label: "被保护/亏欠", relation: "character-character" },
  { source: "root", target: "dependent", label: "守护/责任", relation: "character-character" },
  { source: "root", target: "observer", label: "知情/旁观", relation: "character-character" },
  { source: "closest-ally", target: "protector", label: "协作保护", relation: "character-character" },
  { source: "rival", target: "enemy", label: "临时利用/互不信任", relation: "character-character" },
  { source: "mentor", target: "observer", label: "共享旧识", relation: "character-character" },
  { source: "protector", target: "dependent", label: "保护关系", relation: "character-character" },
];

export const GRAPH_VIEWS = [
  {
    id: "overview",
    label: "总览",
    children: [
      { id: "overview-all", label: "全部角色", rootId: "root", include: "all" },
    ],
  },
  {
    id: "characters",
    label: "人物",
    children: [
      { id: "core-circle", label: "核心圈", rootId: "root", include: ["root", "closest-ally", "rival", "mentor", "enemy"] },
      { id: "care-line", label: "守护线", rootId: "root", include: ["root", "closest-ally", "protector", "dependent", "observer"] },
      { id: "conflict-line", label: "冲突线", rootId: "root", include: ["root", "rival", "enemy", "mentor", "observer"] },
    ],
  },
];

export const DATASET = {
  key: "character-network",
  rootId: "root",
  nodes,
  edges,
  characterGroups: {
    core: { label: "中心", color: "#c0a060" },
    support: { label: "亲密", color: "#7fa0c8" },
    conflict: { label: "冲突", color: "#a05060" },
    neutral: { label: "旁支", color: "#5a6070" },
  },
  ui: {
    indexAriaLabel: "角色关系图索引",
  },
};
