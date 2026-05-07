// Generic starter dataset. Replace this file for each narrative world.

export const TYPE_META = {
  character: { label: "角色", icon: "👤", size: 42, depth: -8 },
  event: { label: "事件", icon: "⚡", size: 32, depth: -16 },
  faction: { label: "阵营", icon: "🏰", size: 36, depth: -24 },
  place: { label: "地点", icon: "📍", size: 34, depth: -22 },
  object: { label: "物品", icon: "🗡️", size: 30, depth: -20 },
};

const nodes = [
  {
    id: "root",
    label: "中心节点",
    type: "character",
    zone: "character",
    faction: "core",
    importance: 100,
    description: "关系网的叙事中心，连接主要人物、关键事件和核心阵营。替换此节点为故事中的主角、家族或机构。",
  },
  {
    id: "ally",
    label: "盟友",
    type: "character",
    zone: "character",
    faction: "core",
    importance: 80,
    description: "与中心节点共同推动主线的核心角色。这个简介应说明其身份、动机以及与主线冲突的关系。",
  },
  {
    id: "rival",
    label: "对手",
    type: "character",
    zone: "character",
    faction: "opposition",
    importance: 80,
    description: "与中心节点形成冲突或镜像关系的关键角色。描述应突出矛盾来源、立场差异或宿命牵连。",
  },
  {
    id: "turning-event",
    label: "转折事件",
    type: "event",
    zone: "event",
    importance: 70,
    description: "改变人物关系或世界局势的关键事件。描述应说明事件如何推动冲突升级或关系重组。",
  },
  {
    id: "core",
    label: "核心阵营",
    type: "faction",
    zone: "world",
    importance: 70,
    description: "中心人物所属或主要依赖的阵营。它定义了人物行动的资源、身份边界和价值立场。",
  },
  {
    id: "opposition",
    label: "对立阵营",
    type: "faction",
    zone: "world",
    importance: 70,
    description: "与核心阵营形成冲突的力量。它可以是敌对组织、家族、国家、魔物阵营或制度压力。",
  },
];

const edges = [
  { source: "root", target: "ally", label: "信任/协作", relation: "character-character" },
  {
    source: "root",
    target: "rival",
    label: "核心冲突",
    relation: "character-character",
    perspectives: [
      { from: "root", to: "rival", label: "必须面对的对手" },
      { from: "rival", to: "root", label: "需要超越或摧毁的对象" },
    ],
  },
  { source: "root", target: "turning-event", label: "卷入", relation: "character-event" },
  { source: "rival", target: "turning-event", label: "引发", relation: "character-event" },
  { source: "root", target: "core", label: "归属", relation: "character-world" },
  { source: "rival", target: "opposition", label: "代表", relation: "character-world" },
  { source: "core", target: "opposition", label: "对立", relation: "world-world" },
];

export const GRAPH_VIEWS = [
  {
    id: "overview",
    label: "总览",
    children: [
      { id: "overview-all", label: "全部总览", rootId: "root", include: "all" },
      { id: "main-line", label: "主线", rootId: "root", include: ["root", "ally", "rival", "turning-event", "core", "opposition"] },
    ],
  },
  {
    id: "characters",
    label: "人物",
    children: [
      { id: "character-core", label: "核心人物", rootId: "root", include: ["root", "ally", "rival", "core", "opposition"] },
    ],
  },
];

export const DATASET = {
  key: "story",
  rootId: "root",
  nodes,
  edges,
  factions: {
    core: { label: "核心阵营", color: "#c0a060" },
    opposition: { label: "对立阵营", color: "#a05060" },
  },
  ui: {
    indexAriaLabel: "关系图索引",
  },
};
