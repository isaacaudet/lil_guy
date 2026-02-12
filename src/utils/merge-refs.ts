import * as React from "react";

type PossibleRef<T> = React.Ref<T> | React.RefCallback<T> | undefined | null;

/**
 * Merges multiple refs into a single callback ref.
 * Useful for forwarding refs to a component while also using a local ref.
 */
export function mergeRefs<T>(
	refs: PossibleRef<T>[]
): React.RefCallback<T> | null {
	const filteredRefs = refs.filter(
		(ref): ref is NonNullable<PossibleRef<T>> => ref != null
	);

	if (filteredRefs.length === 0) {
		return null;
	}

	if (filteredRefs.length === 1) {
		const ref = filteredRefs[0];
		if (typeof ref === "function") {
			return ref;
		}
		return (instance) => {
			(ref as React.MutableRefObject<T | null>).current = instance;
		};
	}

	return (instance) => {
		for (const ref of filteredRefs) {
			if (typeof ref === "function") {
				ref(instance);
			} else if (ref != null) {
				(ref as React.MutableRefObject<T | null>).current = instance;
			}
		}
	};
}

/**
 * Hook version of mergeRefs that memoizes the result.
 */
export function useMergeRefs<T>(
	refs: PossibleRef<T>[]
): React.RefCallback<T> | null {
	return React.useMemo(() => mergeRefs(refs), refs);
}
