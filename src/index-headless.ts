// Headless exports — no React dependency
export type { PixelGrid, ColorToken, Palette, AvatarConfig, RenderOptions, Intensity3D, GameId } from './types';
export { GRID_SIZE } from './types';

export { hash, hashNth } from './hash';
export { resolve, LUCKY_ODDS, DEAL_PREFIX, dealOf } from './resolve';
export { FOUNDER_SEED, FOUNDER_LOOK, FOUNDER_COPIES, isFounder, isFounderCopy } from './founder';
export { RETIRED_EYES, CAPSULE_ONLY } from './parts/weights';
export { compose, composeBase, buddyAlone, FOOT_STYLES, shows } from './compose';

export { palettes, getPalette, resolveColor, shadePalette, SHADE_COUNT, luckyPalette, paletteOf } from './palette';
export { heads, eyes, mouths, cheeks, hair, bodies, accessories } from './parts';
export { items, itemById, gameItems, freeItem, dress, withItems, inSeason, GAMES, machineName, SHOWPIECE_WEIGHT, itemWeight } from './items';
export type { Item, Slot, ItemGame } from './items';
export { encode, decode, starter, roll, mysteryMachine, wearOf, gradeOf, nameOf, special, nebulaPhase, temperTint, slotOf, rollSeason, FINISHES, GRADES, WEAR, DEEP_BLUE_PRINTS } from './owned';
export type { Owned, Finish, Grade } from './owned';
export { paint, SMALL_SIZE } from './paint';
export { animate, animateLoop, frameAt, drawFrame, toAnimatedSvg, closeEyes, squashRows, MOVES, HEADROOM, FRAME_WIDTH, WIDE_FRAME_WIDTH, FRAME_HEIGHT, EMOTE_UNLOCKS } from './animate';
export { PINS, MAX_PINS, pinById, tallyMarks, GOLD_RIM_DAYS } from './pins';
export type { Pin } from './pins';
export type { Emote, Move, Animation, AnimationFrame, AnimateOptions, AnimatedSvgOptions, PixelTarget } from './animate';

export { toSvgString } from './render-string';
export { toPng } from './export-png';

export { DEFAULT_COLORS, DEFAULT_COLORS_LIGHT, DEFAULT_COLORS_DARK, getColor } from './utils/colors';
export { traitOdds, guyOneIn, guyRank, guyScore, GUY_TIERS, FOUNDER_RANK, type GuyRank, copyOneIn, TRAIT_SLOTS, TONE_NAMES, ARM_NAMES, FOOT_NAMES } from './rarity';
export type { TraitOdds, TraitSlot } from './rarity';
export { TRAIT_ICONS, TIER_ICONS } from './icons';
export type { Tier } from './icons';
export { makeSeed, pickable, allowed, encodeLook, decodeLook, lookOf, rollPart, rareParts, partName, partCode, readPart, unlocksOf, partCost, PART_SLOTS, PART_ODDS } from './look';
export type { Look, LookSlot, Unlocks, PartDrop } from './look';
export { toShareSvg } from './share';
export type { ShareOptions } from './share';
export { createShine, shineData, type Shine } from './shine';
export { voxelColumns, voxelItem, voxelMesh, itemFrame, ownedOf, surfaceOf } from './voxel';
export type { VoxelColumn, VoxelMesh, VoxelSource, VoxelOptions, Surface, SurfaceKind } from './voxel';
export { FRAME_SLOTS } from './animate';
export { AURAS, ONE_OF_ONE_AURAS, AURA_ODDS, auraById, auraCells, auraColor, auraColors } from './auras';
export { collectorNotes, type Note } from './collector';
export { EFFECTS, FX_IDS, rollFx, fxColor, applyFx, type Fx, type Effect } from './effects';
export { TAG_MAX, cleanTag, floatShare, tradeFloat, tradeGames, machineSet, setProgress } from './collect';
export { CARD_WIDTH, CARD_HEIGHT, cardFrames, cardPlayer, cardStill, cardArtPlayer, cardArtFrames, toCardArtGif, toCardArtPng, toCardGif, toCardPng, toGuyGif, textWidth, CARD_EDGES, CARD_GOLDS, type CardInput, type CardPlayerOptions, type CardEdge, type CardGold, type CardStyle } from './card';
export { encodeGif, encodePng, encodeApng, fewerColours, upscale, type Frames } from './gif';
export { LOOP_MS, SHADER_FINISHES, noiseOf, finishColor, GLSL_COMMON } from './finish-shader';
export { shineFrame, shines, SHINE_FRAGMENT } from './shine';
export { cardFace, cardFaceAt, faceMoves, buddyLift, createCardShader, CARD_FRAGMENT, FACE_WIDTH, FACE_HEIGHT, FACE_BUDDY_SPOTS, type CardFace, type FaceSpec, type FaceBuddySpot, type CardShader, type Hover } from './card-face';
export { CARD_LOOKS, GLSL_LOOKS, lookFor, type CardLook, type LookOptions } from './card-looks';
export { ART_VERSION, GUY_WIDTH, GUY_HEIGHT, BUDDY_GUY_WIDTH, bakeGuy, bakeCard, bakeView, profileFrames, toProfilePng, toProfileGif, PROFILE_SIZE, bakedImage, sheetOf, sheetColumns, SHEET_MAX, bakeSquare, ICON_SIZE, FACE_SIZE, cardInputOf, ogFrames, OG_WIDTH, OG_HEIGHT, CARD_FULL_MS, shineFit, guyCode, readGuyCode, faceSpec, animateOptions, isMove, type GuySpec, type CardSpec, type BakedKind } from './bake';
export { defineLilGuyHere as defineLilGuy } from './bake';
export { BAKED_SIZE, PICTURE_VIEWS, TITLE_MAX, viewSize, type View } from './guy-code';
export { LILGUYS_HOST, LIL_GUY_PRESETS, LIL_GUY_PLACEHOLDER, BATCH_MAX, lilGuyUrl, lilGuyImg, lilGuySize, lilGuysFor, setLilGuysHost, lilGuysHost, type LilGuyInfo, type Who, type LilGuyPreset, type LilGuyPresetName, type LilGuyFormat, type LilGuyUrlOptions, type LilGuyImgOptions } from './kit';
export type { LilGuyOptions } from './element';

export { PAINTS, PAINT_IDS, PAINTABLE, painted, LIMITED_PAINT_COST, paintMonth, paintOnSale, paintsOnSale, paintCost } from './paints';
export type { PaintId } from './paints';
export { smeltValue, craftable, craftCopy, metalText, metalCoins, CRAFT_COST, PAINT_COST, SCRAP, RECLAIMED, REFINED } from './craft';
export { NAME_KEY, nameKey, nameSkeleton } from './name-key';
export { crowdSprite, crowdSheet, crowdShine, CROWD_SIZES, type CrowdSize, type CrowdSprite, type CrowdShine } from './crowd';
export { createCrowd, crowdSeats, crowdPicture, type Crowd, type CrowdOptions, type CrowdGuy, type CrowdSeat } from './crowd-stage';
export { emoteFrames, EMOTE_SET, EMOTE_SIZE, isEmote } from './emotes';
