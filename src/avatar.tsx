import * as React from "react";

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

export type AvatarContextValue = {
	imageLoadingStatus: ImageLoadingStatus;
	onImageLoadingStatusChange: (status: ImageLoadingStatus) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

/**
 * Hook to access the Avatar context.
 * Throws an error if used outside of Avatar.
 */
export const useAvatarContext = () => {
	const context = React.useContext(AvatarContext);
	if (!context) {
		throw new Error(
			"Avatar compound components must be rendered within an Avatar component"
		);
	}
	return context;
};

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement> & {
	/** Render as the child element instead of a span */
	asChild?: boolean;
};

/**
 * Root avatar component that provides context for image loading state.
 *
 * @example
 * ```tsx
 * <Avatar className="w-10 h-10 rounded-full overflow-hidden">
 *   <AvatarImage src="/photo.jpg" alt="John" />
 *   <AvatarFallback name="John Doe" />
 * </Avatar>
 * ```
 */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
	({ children, className, style, asChild: _asChild, ...props }, ref) => {
		const [imageLoadingStatus, setImageLoadingStatus] =
			React.useState<ImageLoadingStatus>("idle");

		const contextValue: AvatarContextValue = React.useMemo(
			() => ({
				imageLoadingStatus,
				onImageLoadingStatusChange: setImageLoadingStatus,
			}),
			[imageLoadingStatus]
		);

		return (
			<AvatarContext.Provider value={contextValue}>
				<span
					ref={ref}
					className={className}
					style={{
						position: "relative" as const,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						overflow: "hidden",
						...style,
					}}
					data-avatar=""
					data-state={imageLoadingStatus}
					{...props}
				>
					{children}
				</span>
			</AvatarContext.Provider>
		);
	}
);

Avatar.displayName = "Avatar";
