import * as React from "react";
import { toAnimatedSvg, type AnimatedSvgOptions, type Emote, type Move } from "./animate";
import type { GameId, RenderOptions } from "./types";

export interface LilGuyAnimatedProps
	extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children" | "title"> {
	/** The seed the guy is drawn from. */
	name: string;
	/** Which move to play. */
	move: Move;
	/** Width in pixels; the height is a quarter more, for jumps. @default 64 */
	size?: number;
	/** Dress him for a game: its free hat unless `equip` says otherwise. */
	game?: GameId;
	/** Item ids or encoded copies to wear. */
	equip?: string[];
	/** Pin specific parts. */
	parts?: RenderOptions["parts"];
	/** An emote to show over the move. */
	emote?: Emote;
	/** Play once and hold the last frame. @default false */
	once?: boolean;
	/** Show the best copy's grade in the frames. @default true */
	rarity?: boolean;
	/** Accessible name; without it the guy is decorative. */
	title?: string;
}

/**
 * A lil guy playing a move: the library's animated SVG, which plays itself
 * with CSS, so there is no timer running in React.
 *
 * @example
 * ```tsx
 * <LilGuyAnimated name={player.seed} move="cheer" equip={[player.hat]} size={96} />
 * ```
 */
export function LilGuyAnimated({ name, move, size = 64, game, equip, parts, emote, once, rarity, title, style, ...props }: LilGuyAnimatedProps) {
	const svg = React.useMemo(() => {
		const options: AnimatedSvgOptions = { size, game, equip, parts, emote, once, rarity, title };
		return toAnimatedSvg(name, move, options);
	}, [name, move, size, game, equip?.join(","), JSON.stringify(parts), emote, once, rarity, title]);
	// The SVG is only rectangles, colours and a style block made by the
	// library; the name seeds it and is never written into it, and the title
	// is escaped.
	return <span data-lil-guy-animated="" style={{ display: "inline-block", lineHeight: 0, ...style }} {...props} dangerouslySetInnerHTML={{ __html: svg }} />;
}
