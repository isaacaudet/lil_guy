import * as React from "react";
import { useAvatarContext } from "./avatar";
import { LilGuy, type LilGuyProps } from "./lil-guy";

const WHITESPACE_REGEX = /\s+/;

export type AvatarFallbackProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"children"
> & {
	/**
	 * The name to derive initials and LilGuy from.
	 */
	name?: string;

	/**
	 * Delay in milliseconds before showing the fallback.
	 * Useful to prevent flashing when images load quickly.
	 * @default 0
	 */
	delayMs?: number;

	/**
	 * Custom children to render instead of initials or LilGuy.
	 */
	children?: React.ReactNode;

	/**
	 * Use the LilGuy pixel avatar as fallback instead of initials.
	 * @default true
	 */
	lilGuy?: boolean;

	/**
	 * Props to pass to the LilGuy component.
	 */
	lilGuyProps?: Omit<LilGuyProps, "name">;
};

/**
 * Extracts initials from a name string.
 */
function getInitials(name: string): string {
	const parts = name.trim().split(WHITESPACE_REGEX);
	if (parts.length === 0) return "";
	if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() || "";

	const firstInitial = parts[0]?.charAt(0) || "";
	const lastInitial = parts.at(-1)?.charAt(0) || "";
	return (firstInitial + lastInitial).toUpperCase();
}

/**
 * Fallback component that displays when the image fails to load.
 * Uses LilGuy pixel avatar by default, can show initials or custom content.
 *
 * @example
 * ```tsx
 * // With LilGuy pixel avatar (default)
 * <AvatarFallback name="John Doe" />
 *
 * // With initials
 * <AvatarFallback name="John Doe" lilGuy={false} />
 *
 * // With custom content
 * <AvatarFallback>
 *   <UserIcon />
 * </AvatarFallback>
 * ```
 */
export const AvatarFallback = React.forwardRef<
	HTMLSpanElement,
	AvatarFallbackProps
>(
	(
		{
			name = "",
			delayMs = 0,
			children,
			lilGuy = true,
			lilGuyProps,
			className,
			style,
			...props
		},
		ref
	) => {
		const { imageLoadingStatus } = useAvatarContext();
		const [canRender, setCanRender] = React.useState(delayMs === 0);

		React.useEffect(() => {
			if (delayMs > 0) {
				const timerId = window.setTimeout(() => setCanRender(true), delayMs);
				return () => window.clearTimeout(timerId);
			}
		}, [delayMs]);

		const initials = React.useMemo(() => getInitials(name), [name]);

		const shouldRender =
			canRender &&
			imageLoadingStatus !== "loaded" &&
			imageLoadingStatus !== "loading";

		if (!shouldRender) return null;

		// Custom children take precedence
		if (children) {
			return (
				<span
					className={className}
					data-avatar-fallback=""
					ref={ref}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "100%",
						height: "100%",
						...style,
					}}
					{...props}
				>
					{children}
				</span>
			);
		}

		// LilGuy mode (default)
		if (lilGuy) {
			return (
				<LilGuy
					className={className}
					data-avatar-fallback=""
					name={name}
					ref={ref as React.Ref<HTMLDivElement>}
					size="100%"
					{...lilGuyProps}
					style={{ ...style }}
					{...props}
				/>
			);
		}

		// Initials mode
		return (
			<span
				className={className}
				data-avatar-fallback=""
				ref={ref}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					...style,
				}}
				{...props}
			>
				{initials}
			</span>
		);
	}
);

AvatarFallback.displayName = "AvatarFallback";
