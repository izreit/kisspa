// This file is derived from jsx.d.ts of Preact, distributed under the MIT License.
// (https://github.com/preactjs/preact/blob/4c20c23c16dd60f380ce9fe98afc93041a7e1562/LICENSE)
// TODO redistribute the license file.

/// <reference lib="dom" />

import type { Accessor, AccessorOr, JSXNode, JSXNodeAsync, Ref } from './types';

type Booleanish = boolean | 'true' | 'false';

export namespace JSXInternal {
  // Ugh! A dummy variable to make JSXInternal a value but not a type-only namespace.
  // it seems that type-only namespaces cannot be exported as a member of another
  // namespace when `isolatedModules: true`...
  export const _ = 1;

	export interface IntrinsicAttributes {
    ref?:
      | Ref<HTMLElement>
      | ((v: HTMLElement) => void)
      | (Ref<HTMLElement> | ((v: HTMLElement) => void))[];
		key?: any;
	}

	// export type ElementType<P = any> =
	// 	| {
	// 			[K in keyof IntrinsicElements]: P extends IntrinsicElements[K]
	// 				? K
	// 				: never;
	// 	  }[keyof IntrinsicElements]
	// 	| ComponentType<P>;

  export type AsyncElement = JSXNodeAsync;
	export type Element = JSXNode;

	// biome-ignore lint/suspicious/noEmptyInterface: required for JSX even empty.
	export interface ElementAttributesProperty {
		// props: any;
	}

	export interface ElementChildrenAttribute {
		children: any;
	}

	export type DOMCSSProperties = {
		[key in keyof Omit<
			CSSStyleDeclaration,
			| 'item'
			| 'setProperty'
			| 'removeProperty'
			| 'getPropertyValue'
			| 'getPropertyPriority'
		>]?: AccessorOr<string | number | null | undefined>;
	};
	export type AllCSSProperties = {
		[key: string]: AccessorOr<string | number | null | undefined>;
	};
	export interface CSSProperties extends AllCSSProperties, DOMCSSProperties {
		cssText?: AccessorOr<string | null>;
	}

	export type TargetedEvent<
		Target extends EventTarget = EventTarget,
		TypedEvent extends Event = Event
	> = Omit<TypedEvent, 'currentTarget'> & {
		readonly currentTarget: Target;
	};

	export type TargetedAnimationEvent<Target extends EventTarget> = TargetedEvent<Target, AnimationEvent>;
	export type TargetedClipboardEvent<Target extends EventTarget> = TargetedEvent<Target, ClipboardEvent>;
	export type TargetedCompositionEvent<Target extends EventTarget> = TargetedEvent<Target, CompositionEvent>;
	export type TargetedDragEvent<Target extends EventTarget> = TargetedEvent<Target, DragEvent>;
	export type TargetedFocusEvent<Target extends EventTarget> = TargetedEvent<Target, FocusEvent>;
	export type TargetedInputEvent<Target extends EventTarget> = TargetedEvent<Target, InputEvent>;
	export type TargetedKeyboardEvent<Target extends EventTarget> = TargetedEvent<Target, KeyboardEvent>;
	export type TargetedMouseEvent<Target extends EventTarget> = TargetedEvent<Target, MouseEvent>;
	export type TargetedPointerEvent<Target extends EventTarget> = TargetedEvent<Target, PointerEvent>;
	export type TargetedSubmitEvent<Target extends EventTarget> = TargetedEvent<Target, SubmitEvent>;
	export type TargetedTouchEvent<Target extends EventTarget> = TargetedEvent<Target, TouchEvent>;
	export type TargetedTransitionEvent<Target extends EventTarget> = TargetedEvent<Target, TransitionEvent>;
	export type TargetedUIEvent<Target extends EventTarget> = TargetedEvent<Target, UIEvent>;
	export type TargetedWheelEvent<Target extends EventTarget> = TargetedEvent<Target, WheelEvent>;
	export type TargetedPictureInPictureEvent<Target extends EventTarget> = TargetedEvent<Target, PictureInPictureEvent>;

	export type EventHandler<E extends TargetedEvent> = { bivarianceHack(event: E): void; }['bivarianceHack'];

	export type AnimationEventHandler<Target extends EventTarget> = EventHandler<TargetedAnimationEvent<Target>>;
	export type ClipboardEventHandler<Target extends EventTarget> = EventHandler<TargetedClipboardEvent<Target>>;
	export type CompositionEventHandler<Target extends EventTarget> = EventHandler<TargetedCompositionEvent<Target>>;
	export type DragEventHandler<Target extends EventTarget> = EventHandler<TargetedDragEvent<Target>>;
	export type FocusEventHandler<Target extends EventTarget> = EventHandler<TargetedFocusEvent<Target>>;
	export type GenericEventHandler<Target extends EventTarget> = EventHandler<TargetedEvent<Target>>;
	export type InputEventHandler<Target extends EventTarget> = EventHandler<TargetedInputEvent<Target>>;
	export type KeyboardEventHandler<Target extends EventTarget> = EventHandler<TargetedKeyboardEvent<Target>>;
	export type MouseEventHandler<Target extends EventTarget> = EventHandler<TargetedMouseEvent<Target>>;
	export type PointerEventHandler<Target extends EventTarget> = EventHandler<TargetedPointerEvent<Target>>;
	export type SubmitEventHandler<Target extends EventTarget> = EventHandler<TargetedSubmitEvent<Target>>;
	export type TouchEventHandler<Target extends EventTarget> = EventHandler<TargetedTouchEvent<Target>>;
	export type TransitionEventHandler<Target extends EventTarget> = EventHandler<TargetedTransitionEvent<Target>>;
	export type UIEventHandler<Target extends EventTarget> = EventHandler<TargetedUIEvent<Target>>;
	export type WheelEventHandler<Target extends EventTarget> = EventHandler<TargetedWheelEvent<Target>>;
	export type PictureInPictureEventHandler<Target extends EventTarget> = EventHandler<TargetedPictureInPictureEvent<Target>>;

	export interface DOMAttributes<Target extends EventTarget> {
		// Image Events
		onLoad?: GenericEventHandler<Target> | undefined;
		onLoadCapture?: GenericEventHandler<Target> | undefined;
		onError?: GenericEventHandler<Target> | undefined;
		onErrorCapture?: GenericEventHandler<Target> | undefined;

		// Clipboard Events
		onCopy?: ClipboardEventHandler<Target> | undefined;
		onCopyCapture?: ClipboardEventHandler<Target> | undefined;
		onCut?: ClipboardEventHandler<Target> | undefined;
		onCutCapture?: ClipboardEventHandler<Target> | undefined;
		onPaste?: ClipboardEventHandler<Target> | undefined;
		onPasteCapture?: ClipboardEventHandler<Target> | undefined;

		// Composition Events
		onCompositionEnd?: CompositionEventHandler<Target> | undefined;
		onCompositionEndCapture?: CompositionEventHandler<Target> | undefined;
		onCompositionStart?: CompositionEventHandler<Target> | undefined;
		onCompositionStartCapture?: CompositionEventHandler<Target> | undefined;
		onCompositionUpdate?: CompositionEventHandler<Target> | undefined;
		onCompositionUpdateCapture?: CompositionEventHandler<Target> | undefined;

		// Details Events
		onToggle?: GenericEventHandler<Target> | undefined;

		// Dialog Events
		onClose?: GenericEventHandler<Target> | undefined;
		onCancel?: GenericEventHandler<Target> | undefined;

		// Focus Events
		onFocus?: FocusEventHandler<Target> | undefined;
		onFocusCapture?: FocusEventHandler<Target> | undefined;
		onFocusIn?: FocusEventHandler<Target> | undefined;
		onFocusInCapture?: FocusEventHandler<Target> | undefined;
		onFocusOut?: FocusEventHandler<Target> | undefined;
		onFocusOutCapture?: FocusEventHandler<Target> | undefined;
		onBlur?: FocusEventHandler<Target> | undefined;
		onBlurCapture?: FocusEventHandler<Target> | undefined;

		// Form Events
		onChange?: GenericEventHandler<Target> | undefined;
		onChangeCapture?: GenericEventHandler<Target> | undefined;
		onInput?: InputEventHandler<Target> | undefined;
		onInputCapture?: InputEventHandler<Target> | undefined;
		onBeforeInput?: InputEventHandler<Target> | undefined;
		onBeforeInputCapture?: InputEventHandler<Target> | undefined;
		onSearch?: GenericEventHandler<Target> | undefined;
		onSearchCapture?: GenericEventHandler<Target> | undefined;
		onSubmit?: SubmitEventHandler<Target> | undefined;
		onSubmitCapture?: SubmitEventHandler<Target> | undefined;
		onInvalid?: GenericEventHandler<Target> | undefined;
		onInvalidCapture?: GenericEventHandler<Target> | undefined;
		onReset?: GenericEventHandler<Target> | undefined;
		onResetCapture?: GenericEventHandler<Target> | undefined;
		onFormData?: GenericEventHandler<Target> | undefined;
		onFormDataCapture?: GenericEventHandler<Target> | undefined;

		// Keyboard Events
		onKeyDown?: KeyboardEventHandler<Target> | undefined;
		onKeyDownCapture?: KeyboardEventHandler<Target> | undefined;
		onKeyPress?: KeyboardEventHandler<Target> | undefined;
		onKeyPressCapture?: KeyboardEventHandler<Target> | undefined;
		onKeyUp?: KeyboardEventHandler<Target> | undefined;
		onKeyUpCapture?: KeyboardEventHandler<Target> | undefined;

		// Media Events
		onAbort?: GenericEventHandler<Target> | undefined;
		onAbortCapture?: GenericEventHandler<Target> | undefined;
		onCanPlay?: GenericEventHandler<Target> | undefined;
		onCanPlayCapture?: GenericEventHandler<Target> | undefined;
		onCanPlayThrough?: GenericEventHandler<Target> | undefined;
		onCanPlayThroughCapture?: GenericEventHandler<Target> | undefined;
		onDurationChange?: GenericEventHandler<Target> | undefined;
		onDurationChangeCapture?: GenericEventHandler<Target> | undefined;
		onEmptied?: GenericEventHandler<Target> | undefined;
		onEmptiedCapture?: GenericEventHandler<Target> | undefined;
		onEncrypted?: GenericEventHandler<Target> | undefined;
		onEncryptedCapture?: GenericEventHandler<Target> | undefined;
		onEnded?: GenericEventHandler<Target> | undefined;
		onEndedCapture?: GenericEventHandler<Target> | undefined;
		onLoadedData?: GenericEventHandler<Target> | undefined;
		onLoadedDataCapture?: GenericEventHandler<Target> | undefined;
		onLoadedMetadata?: GenericEventHandler<Target> | undefined;
		onLoadedMetadataCapture?: GenericEventHandler<Target> | undefined;
		onLoadStart?: GenericEventHandler<Target> | undefined;
		onLoadStartCapture?: GenericEventHandler<Target> | undefined;
		onPause?: GenericEventHandler<Target> | undefined;
		onPauseCapture?: GenericEventHandler<Target> | undefined;
		onPlay?: GenericEventHandler<Target> | undefined;
		onPlayCapture?: GenericEventHandler<Target> | undefined;
		onPlaying?: GenericEventHandler<Target> | undefined;
		onPlayingCapture?: GenericEventHandler<Target> | undefined;
		onProgress?: GenericEventHandler<Target> | undefined;
		onProgressCapture?: GenericEventHandler<Target> | undefined;
		onRateChange?: GenericEventHandler<Target> | undefined;
		onRateChangeCapture?: GenericEventHandler<Target> | undefined;
		onSeeked?: GenericEventHandler<Target> | undefined;
		onSeekedCapture?: GenericEventHandler<Target> | undefined;
		onSeeking?: GenericEventHandler<Target> | undefined;
		onSeekingCapture?: GenericEventHandler<Target> | undefined;
		onStalled?: GenericEventHandler<Target> | undefined;
		onStalledCapture?: GenericEventHandler<Target> | undefined;
		onSuspend?: GenericEventHandler<Target> | undefined;
		onSuspendCapture?: GenericEventHandler<Target> | undefined;
		onTimeUpdate?: GenericEventHandler<Target> | undefined;
		onTimeUpdateCapture?: GenericEventHandler<Target> | undefined;
		onVolumeChange?: GenericEventHandler<Target> | undefined;
		onVolumeChangeCapture?: GenericEventHandler<Target> | undefined;
		onWaiting?: GenericEventHandler<Target> | undefined;
		onWaitingCapture?: GenericEventHandler<Target> | undefined;

		// MouseEvents
		onClick?: MouseEventHandler<Target> | undefined;
		onClickCapture?: MouseEventHandler<Target> | undefined;
		onContextMenu?: MouseEventHandler<Target> | undefined;
		onContextMenuCapture?: MouseEventHandler<Target> | undefined;
		onDblClick?: MouseEventHandler<Target> | undefined;
		onDblClickCapture?: MouseEventHandler<Target> | undefined;
		onDrag?: DragEventHandler<Target> | undefined;
		onDragCapture?: DragEventHandler<Target> | undefined;
		onDragEnd?: DragEventHandler<Target> | undefined;
		onDragEndCapture?: DragEventHandler<Target> | undefined;
		onDragEnter?: DragEventHandler<Target> | undefined;
		onDragEnterCapture?: DragEventHandler<Target> | undefined;
		onDragExit?: DragEventHandler<Target> | undefined;
		onDragExitCapture?: DragEventHandler<Target> | undefined;
		onDragLeave?: DragEventHandler<Target> | undefined;
		onDragLeaveCapture?: DragEventHandler<Target> | undefined;
		onDragOver?: DragEventHandler<Target> | undefined;
		onDragOverCapture?: DragEventHandler<Target> | undefined;
		onDragStart?: DragEventHandler<Target> | undefined;
		onDragStartCapture?: DragEventHandler<Target> | undefined;
		onDrop?: DragEventHandler<Target> | undefined;
		onDropCapture?: DragEventHandler<Target> | undefined;
		onMouseDown?: MouseEventHandler<Target> | undefined;
		onMouseDownCapture?: MouseEventHandler<Target> | undefined;
		onMouseEnter?: MouseEventHandler<Target> | undefined;
		onMouseEnterCapture?: MouseEventHandler<Target> | undefined;
		onMouseLeave?: MouseEventHandler<Target> | undefined;
		onMouseLeaveCapture?: MouseEventHandler<Target> | undefined;
		onMouseMove?: MouseEventHandler<Target> | undefined;
		onMouseMoveCapture?: MouseEventHandler<Target> | undefined;
		onMouseOut?: MouseEventHandler<Target> | undefined;
		onMouseOutCapture?: MouseEventHandler<Target> | undefined;
		onMouseOver?: MouseEventHandler<Target> | undefined;
		onMouseOverCapture?: MouseEventHandler<Target> | undefined;
		onMouseUp?: MouseEventHandler<Target> | undefined;
		onMouseUpCapture?: MouseEventHandler<Target> | undefined;

		// Selection Events
		onSelect?: GenericEventHandler<Target> | undefined;
		onSelectCapture?: GenericEventHandler<Target> | undefined;

		// Touch Events
		onTouchCancel?: TouchEventHandler<Target> | undefined;
		onTouchCancelCapture?: TouchEventHandler<Target> | undefined;
		onTouchEnd?: TouchEventHandler<Target> | undefined;
		onTouchEndCapture?: TouchEventHandler<Target> | undefined;
		onTouchMove?: TouchEventHandler<Target> | undefined;
		onTouchMoveCapture?: TouchEventHandler<Target> | undefined;
		onTouchStart?: TouchEventHandler<Target> | undefined;
		onTouchStartCapture?: TouchEventHandler<Target> | undefined;

		// Pointer Events
		onPointerOver?: PointerEventHandler<Target> | undefined;
		onPointerOverCapture?: PointerEventHandler<Target> | undefined;
		onPointerEnter?: PointerEventHandler<Target> | undefined;
		onPointerEnterCapture?: PointerEventHandler<Target> | undefined;
		onPointerDown?: PointerEventHandler<Target> | undefined;
		onPointerDownCapture?: PointerEventHandler<Target> | undefined;
		onPointerMove?: PointerEventHandler<Target> | undefined;
		onPointerMoveCapture?: PointerEventHandler<Target> | undefined;
		onPointerUp?: PointerEventHandler<Target> | undefined;
		onPointerUpCapture?: PointerEventHandler<Target> | undefined;
		onPointerCancel?: PointerEventHandler<Target> | undefined;
		onPointerCancelCapture?: PointerEventHandler<Target> | undefined;
		onPointerOut?: PointerEventHandler<Target> | undefined;
		onPointerOutCapture?: PointerEventHandler<Target> | undefined;
		onPointerLeave?: PointerEventHandler<Target> | undefined;
		onPointerLeaveCapture?: PointerEventHandler<Target> | undefined;
		onGotPointerCapture?: PointerEventHandler<Target> | undefined;
		onGotPointerCaptureCapture?: PointerEventHandler<Target> | undefined;
		onLostPointerCapture?: PointerEventHandler<Target> | undefined;
		onLostPointerCaptureCapture?: PointerEventHandler<Target> | undefined;

		// UI Events
		onScroll?: UIEventHandler<Target> | undefined;
		onScrollEnd?: UIEventHandler<Target> | undefined;
		onScrollCapture?: UIEventHandler<Target> | undefined;

		// Wheel Events
		onWheel?: WheelEventHandler<Target> | undefined;
		onWheelCapture?: WheelEventHandler<Target> | undefined;

		// Animation Events
		onAnimationStart?: AnimationEventHandler<Target> | undefined;
		onAnimationStartCapture?: AnimationEventHandler<Target> | undefined;
		onAnimationEnd?: AnimationEventHandler<Target> | undefined;
		onAnimationEndCapture?: AnimationEventHandler<Target> | undefined;
		onAnimationIteration?: AnimationEventHandler<Target> | undefined;
		onAnimationIterationCapture?: AnimationEventHandler<Target> | undefined;

		// Transition Events
		onTransitionCancel?: TransitionEventHandler<Target>;
		onTransitionCancelCapture?: TransitionEventHandler<Target>;
		onTransitionEnd?: TransitionEventHandler<Target>;
		onTransitionEndCapture?: TransitionEventHandler<Target>;
		onTransitionRun?: TransitionEventHandler<Target>;
		onTransitionRunCapture?: TransitionEventHandler<Target>;
		onTransitionStart?: TransitionEventHandler<Target>;
		onTransitionStartCapture?: TransitionEventHandler<Target>;

		// PictureInPicture Events
		onEnterPictureInPicture?: PictureInPictureEventHandler<Target>;
		onEnterPictureInPictureCapture?: PictureInPictureEventHandler<Target>;
		onLeavePictureInPicture?: PictureInPictureEventHandler<Target>;
		onLeavePictureInPictureCapture?: PictureInPictureEventHandler<Target>;
		onResize?: PictureInPictureEventHandler<Target>;
		onResizeCapture?: PictureInPictureEventHandler<Target>;
	}

	// All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
	export interface AriaAttributes {
		/** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
		'aria-activedescendant'?: AccessorOr<string | undefined>;
		/** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
		'aria-atomic'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
		 * presented if they are made.
		 */
		'aria-autocomplete'?: AccessorOr<
			'none' | 'inline' | 'list' | 'both' | undefined
		>;
		/**
		 * Defines a string value that labels the current element, which is intended to be converted into Braille.
		 * @see aria-label.
		 */
		'aria-braillelabel'?: AccessorOr<string | undefined>;
		/**
		 * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
		 * @see aria-roledescription.
		 */
		'aria-brailleroledescription'?: AccessorOr<string | undefined>;
		/** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
		'aria-busy'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
		 * @see aria-pressed
		 * @see aria-selected.
		 */
		'aria-checked'?: AccessorOr<Booleanish | 'mixed' | undefined>;
		/**
		 * Defines the total number of columns in a table, grid, or treegrid.
		 * @see aria-colindex.
		 */
		'aria-colcount'?: AccessorOr<number | undefined>;
		/**
		 * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
		 * @see aria-colcount
		 * @see aria-colspan.
		 */
		'aria-colindex'?: AccessorOr<number | undefined>;
		/**
		 * Defines a human readable text alternative of aria-colindex.
		 * @see aria-rowindextext.
		 */
		'aria-colindextext'?: AccessorOr<string | undefined>;
		/**
		 * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
		 * @see aria-colindex
		 * @see aria-rowspan.
		 */
		'aria-colspan'?: AccessorOr<number | undefined>;
		/**
		 * Identifies the element (or elements) whose contents or presence are controlled by the current element.
		 * @see aria-owns.
		 */
		'aria-controls'?: AccessorOr<string | undefined>;
		/** Indicates the element that represents the current item within a container or set of related elements. */
		'aria-current'?: AccessorOr<
			Booleanish | 'page' | 'step' | 'location' | 'date' | 'time' | undefined
		>;
		/**
		 * Identifies the element (or elements) that describes the object.
		 * @see aria-labelledby
		 */
		'aria-describedby'?: AccessorOr<string | undefined>;
		/**
		 * Defines a string value that describes or annotates the current element.
		 * @see related aria-describedby.
		 */
		'aria-description'?: AccessorOr<string | undefined>;
		/**
		 * Identifies the element that provides a detailed, extended description for the object.
		 * @see aria-describedby.
		 */
		'aria-details'?: AccessorOr<string | undefined>;
		/**
		 * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
		 * @see aria-hidden
		 * @see aria-readonly.
		 */
		'aria-disabled'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Indicates what functions can be performed when a dragged object is released on the drop target.
		 * @deprecated in ARIA 1.1
		 */
		'aria-dropeffect'?: AccessorOr<
			'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup' | undefined
		>;
		/**
		 * Identifies the element that provides an error message for the object.
		 * @see aria-invalid
		 * @see aria-describedby.
		 */
		'aria-errormessage'?: AccessorOr<string | undefined>;
		/** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
		'aria-expanded'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
		 * allows assistive technology to override the general default of reading in document source order.
		 */
		'aria-flowto'?: AccessorOr<string | undefined>;
		/**
		 * Indicates an element's "grabbed" state in a drag-and-drop operation.
		 * @deprecated in ARIA 1.1
		 */
		'aria-grabbed'?: AccessorOr<Booleanish | undefined>;
		/** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
		'aria-haspopup'?: AccessorOr<
			Booleanish | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | undefined
		>;
		/**
		 * Indicates whether the element is exposed to an accessibility API.
		 * @see aria-disabled.
		 */
		'aria-hidden'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Indicates the entered value does not conform to the format expected by the application.
		 * @see aria-errormessage.
		 */
		'aria-invalid'?: AccessorOr<Booleanish | 'grammar' | 'spelling' | undefined>;
		/** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
		'aria-keyshortcuts'?: AccessorOr<string | undefined>;
		/**
		 * Defines a string value that labels the current element.
		 * @see aria-labelledby.
		 */
		'aria-label'?: AccessorOr<string | undefined>;
		/**
		 * Identifies the element (or elements) that labels the current element.
		 * @see aria-describedby.
		 */
		'aria-labelledby'?: AccessorOr<string | undefined>;
		/** Defines the hierarchical level of an element within a structure. */
		'aria-level'?: AccessorOr<number | undefined>;
		/** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
		'aria-live'?: AccessorOr<'off' | 'assertive' | 'polite' | undefined>;
		/** Indicates whether an element is modal when displayed. */
		'aria-modal'?: AccessorOr<Booleanish | undefined>;
		/** Indicates whether a text box accepts multiple lines of input or only a single line. */
		'aria-multiline'?: AccessorOr<Booleanish | undefined>;
		/** Indicates that the user may select more than one item from the current selectable descendants. */
		'aria-multiselectable'?: AccessorOr<Booleanish | undefined>;
		/** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
		'aria-orientation'?: AccessorOr<'horizontal' | 'vertical' | undefined>;
		/**
		 * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
		 * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
		 * @see aria-controls.
		 */
		'aria-owns'?: AccessorOr<string | undefined>;
		/**
		 * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
		 * A hint could be a sample value or a brief description of the expected format.
		 */
		'aria-placeholder'?: AccessorOr<string | undefined>;
		/**
		 * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
		 * @see aria-setsize.
		 */
		'aria-posinset'?: AccessorOr<number | undefined>;
		/**
		 * Indicates the current "pressed" state of toggle buttons.
		 * @see aria-checked
		 * @see aria-selected.
		 */
		'aria-pressed'?: AccessorOr<Booleanish | 'mixed' | undefined>;
		/**
		 * Indicates that the element is not editable, but is otherwise operable.
		 * @see aria-disabled.
		 */
		'aria-readonly'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
		 * @see aria-atomic.
		 */
		'aria-relevant'?: AccessorOr<
			| 'additions'
			| 'additions removals'
			| 'additions text'
			| 'all'
			| 'removals'
			| 'removals additions'
			| 'removals text'
			| 'text'
			| 'text additions'
			| 'text removals'
			| undefined
		>;
		/** Indicates that user input is required on the element before a form may be submitted. */
		'aria-required'?: AccessorOr<Booleanish | undefined>;
		/** Defines a human-readable, author-localized description for the role of an element. */
		'aria-roledescription'?: AccessorOr<string | undefined>;
		/**
		 * Defines the total number of rows in a table, grid, or treegrid.
		 * @see aria-rowindex.
		 */
		'aria-rowcount'?: AccessorOr<number | undefined>;
		/**
		 * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
		 * @see aria-rowcount
		 * @see aria-rowspan.
		 */
		'aria-rowindex'?: AccessorOr<number | undefined>;
		/**
		 * Defines a human readable text alternative of aria-rowindex.
		 * @see aria-colindextext.
		 */
		'aria-rowindextext'?: AccessorOr<string | undefined>;
		/**
		 * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
		 * @see aria-rowindex
		 * @see aria-colspan.
		 */
		'aria-rowspan'?: AccessorOr<number | undefined>;
		/**
		 * Indicates the current "selected" state of various widgets.
		 * @see aria-checked
		 * @see aria-pressed.
		 */
		'aria-selected'?: AccessorOr<Booleanish | undefined>;
		/**
		 * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
		 * @see aria-posinset.
		 */
		'aria-setsize'?: AccessorOr<number | undefined>;
		/** Indicates if items in a table or grid are sorted in ascending or descending order. */
		'aria-sort'?: AccessorOr<
			'none' | 'ascending' | 'descending' | 'other' | undefined
		>;
		/** Defines the maximum allowed value for a range widget. */
		'aria-valuemax'?: AccessorOr<number | undefined>;
		/** Defines the minimum allowed value for a range widget. */
		'aria-valuemin'?: AccessorOr<number | undefined>;
		/**
		 * Defines the current value for a range widget.
		 * @see aria-valuetext.
		 */
		'aria-valuenow'?: AccessorOr<number | undefined>;
		/** Defines the human readable text alternative of aria-valuenow for a range widget. */
		'aria-valuetext'?: AccessorOr<string | undefined>;
	}

	// All the WAI-ARIA 1.2 role attribute values from https://www.w3.org/TR/wai-aria-1.2/#role_definitions
	type WAIAriaRole =
		| 'alert'
		| 'alertdialog'
		| 'application'
		| 'article'
		| 'banner'
		| 'blockquote'
		| 'button'
		| 'caption'
		| 'cell'
		| 'checkbox'
		| 'code'
		| 'columnheader'
		| 'combobox'
		| 'command'
		| 'complementary'
		| 'composite'
		| 'contentinfo'
		| 'definition'
		| 'deletion'
		| 'dialog'
		| 'directory'
		| 'document'
		| 'emphasis'
		| 'feed'
		| 'figure'
		| 'form'
		| 'generic'
		| 'grid'
		| 'gridcell'
		| 'group'
		| 'heading'
		| 'img'
		| 'input'
		| 'insertion'
		| 'landmark'
		| 'link'
		| 'list'
		| 'listbox'
		| 'listitem'
		| 'log'
		| 'main'
		| 'marquee'
		| 'math'
		| 'meter'
		| 'menu'
		| 'menubar'
		| 'menuitem'
		| 'menuitemcheckbox'
		| 'menuitemradio'
		| 'navigation'
		| 'none'
		| 'note'
		| 'option'
		| 'paragraph'
		| 'presentation'
		| 'progressbar'
		| 'radio'
		| 'radiogroup'
		| 'range'
		| 'region'
		| 'roletype'
		| 'row'
		| 'rowgroup'
		| 'rowheader'
		| 'scrollbar'
		| 'search'
		| 'searchbox'
		| 'section'
		| 'sectionhead'
		| 'select'
		| 'separator'
		| 'slider'
		| 'spinbutton'
		| 'status'
		| 'strong'
		| 'structure'
		| 'subscript'
		| 'superscript'
		| 'switch'
		| 'tab'
		| 'table'
		| 'tablist'
		| 'tabpanel'
		| 'term'
		| 'textbox'
		| 'time'
		| 'timer'
		| 'toolbar'
		| 'tooltip'
		| 'tree'
		| 'treegrid'
		| 'treeitem'
		| 'widget'
		| 'window'
		| 'none presentation';

	// All the Digital Publishing WAI-ARIA 1.0 role attribute values from https://www.w3.org/TR/dpub-aria-1.0/#role_definitions
	type DPubAriaRole =
		| 'doc-abstract'
		| 'doc-acknowledgments'
		| 'doc-afterword'
		| 'doc-appendix'
		| 'doc-backlink'
		| 'doc-biblioentry'
		| 'doc-bibliography'
		| 'doc-biblioref'
		| 'doc-chapter'
		| 'doc-colophon'
		| 'doc-conclusion'
		| 'doc-cover'
		| 'doc-credit'
		| 'doc-credits'
		| 'doc-dedication'
		| 'doc-endnote'
		| 'doc-endnotes'
		| 'doc-epigraph'
		| 'doc-epilogue'
		| 'doc-errata'
		| 'doc-example'
		| 'doc-footnote'
		| 'doc-foreword'
		| 'doc-glossary'
		| 'doc-glossref'
		| 'doc-index'
		| 'doc-introduction'
		| 'doc-noteref'
		| 'doc-notice'
		| 'doc-pagebreak'
		| 'doc-pagelist'
		| 'doc-part'
		| 'doc-preface'
		| 'doc-prologue'
		| 'doc-pullquote'
		| 'doc-qna'
		| 'doc-subtitle'
		| 'doc-tip'
		| 'doc-toc';

	type AriaRole = WAIAriaRole | DPubAriaRole;

	export interface KisspaAttributes {
		children?: Element | Element[];
	}

	export interface HTMLAttributes<RefType extends EventTarget = EventTarget>
		extends DOMAttributes<RefType>, AriaAttributes, IntrinsicAttributes, KisspaAttributes
	{
		// Standard HTML Attributes
		accept?: string | undefined | Accessor<string | undefined>;
		acceptCharset?: string | undefined | Accessor<string | undefined>;
		'accept-charset'?: HTMLAttributes['acceptCharset'];
		accessKey?: string | undefined | Accessor<string | undefined>;
		accesskey?: HTMLAttributes['accessKey'];
		action?: string | undefined | Accessor<string | undefined>;
		allow?: string | undefined | Accessor<string | undefined>;
		allowFullScreen?: boolean | undefined | Accessor<boolean | undefined>;
		allowTransparency?: boolean | undefined | Accessor<boolean | undefined>;
		alt?: string | undefined | Accessor<string | undefined>;
		as?: string | undefined | Accessor<string | undefined>;
		async?: boolean | undefined | Accessor<boolean | undefined>;
		autocomplete?: string | undefined | Accessor<string | undefined>;
		autoComplete?: string | undefined | Accessor<string | undefined>;
		autocorrect?: string | undefined | Accessor<string | undefined>;
		autoCorrect?: string | undefined | Accessor<string | undefined>;
		autofocus?: boolean | undefined | Accessor<boolean | undefined>;
		autoFocus?: boolean | undefined | Accessor<boolean | undefined>;
		autoPlay?: boolean | undefined | Accessor<boolean | undefined>;
		autoplay?: boolean | undefined | Accessor<boolean | undefined>;
		capture?: boolean | string | undefined | Accessor<string | undefined>;
		cellPadding?: number | string | undefined | Accessor<string | undefined>;
		cellSpacing?: number | string | undefined | Accessor<string | undefined>;
		charSet?: string | undefined | Accessor<string | undefined>;
		charset?: string | undefined | Accessor<string | undefined>;
		challenge?: string | undefined | Accessor<string | undefined>;
		checked?: boolean | undefined | Accessor<boolean | undefined>;
		cite?: string | undefined | Accessor<string | undefined>;
		class?: string | undefined | Accessor<string | undefined>;
		// className?: string | undefined | Accessor<string | undefined>;
		cols?: number | undefined | Accessor<number | undefined>;
		colSpan?: number | undefined | Accessor<number | undefined>;
		colspan?: number | undefined | Accessor<number | undefined>;
		content?: string | undefined | Accessor<string | undefined>;
		contentEditable?:
			| Booleanish
			| ''
			| 'plaintext-only'
			| 'inherit'
			| undefined
			| Accessor<Booleanish | '' | 'inherit' | 'plaintext-only' | undefined>;
		contenteditable?: HTMLAttributes['contentEditable'];
		contextmenu?: string | undefined | Accessor<string | undefined>;
		controls?: boolean | undefined | Accessor<boolean | undefined>;
		controlsList?: string | undefined | Accessor<string | undefined>;
		coords?: string | undefined | Accessor<string | undefined>;
		crossOrigin?: string | undefined | Accessor<string | undefined>;
		crossorigin?: string | undefined | Accessor<string | undefined>;
		data?: string | undefined | Accessor<string | undefined>;
		dateTime?: string | undefined | Accessor<string | undefined>;
		datetime?: string | undefined | Accessor<string | undefined>;
		default?: boolean | undefined | Accessor<boolean | undefined>;
		defaultChecked?: boolean | undefined | Accessor<boolean | undefined>;
		defaultValue?: string | undefined | Accessor<string | undefined>;
		defer?: boolean | undefined | Accessor<boolean | undefined>;
		dir?:
			| 'auto'
			| 'rtl'
			| 'ltr'
			| undefined
			| Accessor<'auto' | 'rtl' | 'ltr' | undefined>;
		disabled?: boolean | undefined | Accessor<boolean | undefined>;
		disableRemotePlayback?:
			| boolean
			| undefined
			| Accessor<boolean | undefined>;
		download?: any | undefined;
		decoding?:
			| 'sync'
			| 'async'
			| 'auto'
			| undefined
			| Accessor<'sync' | 'async' | 'auto' | undefined>;
		draggable?: boolean | undefined | Accessor<boolean | undefined>;
		encType?: string | undefined | Accessor<string | undefined>;
		enctype?: string | undefined | Accessor<string | undefined>;
		enterkeyhint?:
			| 'enter'
			| 'done'
			| 'go'
			| 'next'
			| 'previous'
			| 'search'
			| 'send'
			| undefined
			| Accessor<
					| 'enter'
					| 'done'
					| 'go'
					| 'next'
					| 'previous'
					| 'search'
					| 'send'
					| undefined
			  >;
		elementTiming?: string | undefined | Accessor<string | undefined>;
		elementtiming?: HTMLAttributes['elementTiming'];
		exportparts?: string | undefined | Accessor<string | undefined>;
		for?: string | undefined | Accessor<string | undefined>;
		form?: string | undefined | Accessor<string | undefined>;
		formAction?: string | undefined | Accessor<string | undefined>;
		formaction?: string | undefined | Accessor<string | undefined>;
		formEncType?: string | undefined | Accessor<string | undefined>;
		formenctype?: string | undefined | Accessor<string | undefined>;
		formMethod?: string | undefined | Accessor<string | undefined>;
		formmethod?: string | undefined | Accessor<string | undefined>;
		formNoValidate?: boolean | undefined | Accessor<boolean | undefined>;
		formnovalidate?: boolean | undefined | Accessor<boolean | undefined>;
		formTarget?: string | undefined | Accessor<string | undefined>;
		formtarget?: string | undefined | Accessor<string | undefined>;
		frameBorder?:
			| number
			| string
			| undefined
			| Accessor<number | string | undefined>;
		frameborder?:
			| number
			| string
			| undefined
			| Accessor<number | string | undefined>;
		headers?: string | undefined | Accessor<string | undefined>;
		height?:
			| number
			| string
			| undefined
			| Accessor<number | string | undefined>;
		hidden?:
			| boolean
			| 'hidden'
			| 'until-found'
			| undefined
			| Accessor<boolean | 'hidden' | 'until-found' | undefined>;
		high?: number | undefined | Accessor<number | undefined>;
		href?: string | undefined | Accessor<string | undefined>;
		hrefLang?: string | undefined | Accessor<string | undefined>;
		hreflang?: string | undefined | Accessor<string | undefined>;
		htmlFor?: string | undefined | Accessor<string | undefined>;
		httpEquiv?: string | undefined | Accessor<string | undefined>;
		'http-equiv'?: string | undefined | Accessor<string | undefined>;
		icon?: string | undefined | Accessor<string | undefined>;
		id?: string | undefined | Accessor<string | undefined>;
		indeterminate?: boolean | undefined | Accessor<boolean | undefined>;
		inert?: boolean | undefined | Accessor<boolean | undefined>;
		inputMode?: string | undefined | Accessor<string | undefined>;
		inputmode?: string | undefined | Accessor<string | undefined>;
		integrity?: string | undefined | Accessor<string | undefined>;
		is?: string | undefined | Accessor<string | undefined>;
		keyParams?: string | undefined | Accessor<string | undefined>;
		keyType?: string | undefined | Accessor<string | undefined>;
		kind?: string | undefined | Accessor<string | undefined>;
		label?: string | undefined | Accessor<string | undefined>;
		lang?: string | undefined | Accessor<string | undefined>;
		list?: string | undefined | Accessor<string | undefined>;
		loading?:
			| 'eager'
			| 'lazy'
			| undefined
			| Accessor<'eager' | 'lazy' | undefined>;
		loop?: boolean | undefined | Accessor<boolean | undefined>;
		low?: number | undefined | Accessor<number | undefined>;
		manifest?: string | undefined | Accessor<string | undefined>;
		marginHeight?: number | undefined | Accessor<number | undefined>;
		marginWidth?: number | undefined | Accessor<number | undefined>;
		max?: number | string | undefined | Accessor<string | undefined>;
		maxLength?: number | undefined | Accessor<number | undefined>;
		maxlength?: number | undefined | Accessor<number | undefined>;
		media?: string | undefined | Accessor<string | undefined>;
		mediaGroup?: string | undefined | Accessor<string | undefined>;
		method?: string | undefined | Accessor<string | undefined>;
		min?: number | string | undefined | Accessor<string | undefined>;
		minLength?: number | undefined | Accessor<number | undefined>;
		minlength?: number | undefined | Accessor<number | undefined>;
		multiple?: boolean | undefined | Accessor<boolean | undefined>;
		muted?: boolean | undefined | Accessor<boolean | undefined>;
		name?: string | undefined | Accessor<string | undefined>;
		nomodule?: boolean | undefined | Accessor<boolean | undefined>;
		nonce?: string | undefined | Accessor<string | undefined>;
		noValidate?: boolean | undefined | Accessor<boolean | undefined>;
		novalidate?: boolean | undefined | Accessor<boolean | undefined>;
		open?: boolean | undefined | Accessor<boolean | undefined>;
		optimum?: number | undefined | Accessor<number | undefined>;
		part?: string | undefined | Accessor<string | undefined>;
		pattern?: string | undefined | Accessor<string | undefined>;
		ping?: string | undefined | Accessor<string | undefined>;
		placeholder?: string | undefined | Accessor<string | undefined>;
		playsInline?: boolean | undefined | Accessor<boolean | undefined>;
		playsinline?: boolean | undefined | Accessor<boolean | undefined>;
		popover?:
			| 'auto'
			| 'hint'
			| 'manual'
			| boolean
			| undefined
			| Accessor<'auto' | 'hint' | 'manual' | boolean | undefined>;
		popovertarget?: string | undefined | Accessor<string | undefined>;
		popoverTarget?: string | undefined | Accessor<string | undefined>;
		popovertargetaction?:
			| 'hide'
			| 'show'
			| 'toggle'
			| undefined
			| Accessor<'hide' | 'show' | 'toggle' | undefined>;
		popoverTargetAction?:
			| 'hide'
			| 'show'
			| 'toggle'
			| undefined
			| Accessor<'hide' | 'show' | 'toggle' | undefined>;
		poster?: string | undefined | Accessor<string | undefined>;
		preload?: string | undefined | Accessor<string | undefined>;
		radioGroup?: string | undefined | Accessor<string | undefined>;
		readonly?: boolean | undefined | Accessor<boolean | undefined>;
		readOnly?: boolean | undefined | Accessor<boolean | undefined>;
		referrerpolicy?:
			| 'no-referrer'
			| 'no-referrer-when-downgrade'
			| 'origin'
			| 'origin-when-cross-origin'
			| 'same-origin'
			| 'strict-origin'
			| 'strict-origin-when-cross-origin'
			| 'unsafe-url'
			| undefined
			| Accessor<
					| 'no-referrer'
					| 'no-referrer-when-downgrade'
					| 'origin'
					| 'origin-when-cross-origin'
					| 'same-origin'
					| 'strict-origin'
					| 'strict-origin-when-cross-origin'
					| 'unsafe-url'
					| undefined
			  >;
		rel?: string | undefined | Accessor<string | undefined>;
		required?: boolean | undefined | Accessor<boolean | undefined>;
		reversed?: boolean | undefined | Accessor<boolean | undefined>;
		role?: AriaRole | undefined | Accessor<AriaRole | undefined>;
		rows?: number | undefined | Accessor<number | undefined>;
		rowSpan?: number | undefined | Accessor<number | undefined>;
		rowspan?: number | undefined | Accessor<number | undefined>;
		sandbox?: string | undefined | Accessor<string | undefined>;
		scope?: string | undefined | Accessor<string | undefined>;
		scoped?: boolean | undefined | Accessor<boolean | undefined>;
		scrolling?: string | undefined | Accessor<string | undefined>;
		seamless?: boolean | undefined | Accessor<boolean | undefined>;
		selected?: boolean | undefined | Accessor<boolean | undefined>;
		shape?: string | undefined | Accessor<string | undefined>;
		size?: number | undefined | Accessor<number | undefined>;
		sizes?: string | undefined | Accessor<string | undefined>;
		slot?: string | undefined | Accessor<string | undefined>;
		span?: number | undefined | Accessor<number | undefined>;
		spellcheck?: boolean | undefined | Accessor<boolean | undefined>;
		spellCheck?: boolean | undefined | Accessor<boolean | undefined>;
		src?: string | undefined | Accessor<string | undefined>;
		srcSet?: string | undefined | Accessor<string | undefined>;
		srcset?: string | undefined | Accessor<string | undefined>;
		srcDoc?: string | undefined | Accessor<string | undefined>;
		srcdoc?: string | undefined | Accessor<string | undefined>;
		srcLang?: string | undefined | Accessor<string | undefined>;
		srclang?: string | undefined | Accessor<string | undefined>;
		start?: number | undefined | Accessor<number | undefined>;
		step?:
			| number
			| string
			| undefined
			| Accessor<number | string | undefined>;
		style?:
			| string
			| CSSProperties
			| undefined
			| Accessor<string | CSSProperties | undefined>;
		summary?: string | undefined | Accessor<string | undefined>;
		tabIndex?: number | undefined | Accessor<number | undefined>;
		tabindex?: number | undefined | Accessor<number | undefined>;
		target?: string | undefined | Accessor<string | undefined>;
		title?: string | undefined | Accessor<string | undefined>;
		type?: string | undefined | Accessor<string | undefined>;
		useMap?: string | undefined | Accessor<string | undefined>;
		usemap?: string | undefined | Accessor<string | undefined>;
		value?:
			| string
			| string[]
			| number
			| undefined
			| Accessor<string | string[] | number | undefined>;
		volume?:
			| string
			| number
			| undefined
			| Accessor<string | number | undefined>;
		width?:
			| number
			| string
			| undefined
			| Accessor<number | string | undefined>;
		wmode?: string | undefined | Accessor<string | undefined>;
		wrap?: string | undefined | Accessor<string | undefined>;

		// Non-standard Attributes
		autocapitalize?:
			| 'off'
			| 'none'
			| 'on'
			| 'sentences'
			| 'words'
			| 'characters'
			| undefined
			| Accessor<
					| 'off'
					| 'none'
					| 'on'
					| 'sentences'
					| 'words'
					| 'characters'
					| undefined
			  >;
		autoCapitalize?:
			| 'off'
			| 'none'
			| 'on'
			| 'sentences'
			| 'words'
			| 'characters'
			| undefined
			| Accessor<
					| 'off'
					| 'none'
					| 'on'
					| 'sentences'
					| 'words'
					| 'characters'
					| undefined
			  >;
		disablePictureInPicture?:
			| boolean
			| undefined
			| Accessor<boolean | undefined>;
		results?: number | undefined | Accessor<number | undefined>;
		translate?: boolean | undefined | Accessor<boolean | undefined>;

		// RDFa Attributes
		about?: string | undefined | Accessor<string | undefined>;
		datatype?: string | undefined | Accessor<string | undefined>;
		inlist?: any;
		prefix?: string | undefined | Accessor<string | undefined>;
		property?: string | undefined | Accessor<string | undefined>;
		resource?: string | undefined | Accessor<string | undefined>;
		typeof?: string | undefined | Accessor<string | undefined>;
		vocab?: string | undefined | Accessor<string | undefined>;

		// Microdata Attributes
		itemProp?: string | undefined | Accessor<string | undefined>;
		itemprop?: string | undefined | Accessor<string | undefined>;
		itemScope?: boolean | undefined | Accessor<boolean | undefined>;
		itemscope?: boolean | undefined | Accessor<boolean | undefined>;
		itemType?: string | undefined | Accessor<string | undefined>;
		itemtype?: string | undefined | Accessor<string | undefined>;
		itemID?: string | undefined | Accessor<string | undefined>;
		itemid?: string | undefined | Accessor<string | undefined>;
		itemRef?: string | undefined | Accessor<string | undefined>;
		itemref?: string | undefined | Accessor<string | undefined>;
	}

	export interface IntrinsicElements {
		a: HTMLAttributes<HTMLAnchorElement>;
		abbr: HTMLAttributes<HTMLElement>;
		address: HTMLAttributes<HTMLElement>;
		area: HTMLAttributes<HTMLAreaElement>;
		article: HTMLAttributes<HTMLElement>;
		aside: HTMLAttributes<HTMLElement>;
		audio: HTMLAttributes<HTMLAudioElement>;
		b: HTMLAttributes<HTMLElement>;
		base: HTMLAttributes<HTMLBaseElement>;
		bdi: HTMLAttributes<HTMLElement>;
		bdo: HTMLAttributes<HTMLElement>;
		big: HTMLAttributes<HTMLElement>;
		blockquote: HTMLAttributes<HTMLQuoteElement>;
		body: HTMLAttributes<HTMLBodyElement>;
		br: HTMLAttributes<HTMLBRElement>;
		button: HTMLAttributes<HTMLButtonElement>;
		canvas: HTMLAttributes<HTMLCanvasElement>;
		caption: HTMLAttributes<HTMLTableCaptionElement>;
		cite: HTMLAttributes<HTMLElement>;
		code: HTMLAttributes<HTMLElement>;
		col: HTMLAttributes<HTMLTableColElement>;
		colgroup: HTMLAttributes<HTMLTableColElement>;
		data: HTMLAttributes<HTMLDataElement>;
		datalist: HTMLAttributes<HTMLDataListElement>;
		dd: HTMLAttributes<HTMLElement>;
		del: HTMLAttributes<HTMLModElement>;
		details: HTMLAttributes<HTMLDetailsElement>;
		dfn: HTMLAttributes<HTMLElement>;
		dialog: HTMLAttributes<HTMLDialogElement>;
		div: HTMLAttributes<HTMLDivElement>;
		dl: HTMLAttributes<HTMLDListElement>;
		dt: HTMLAttributes<HTMLElement>;
		em: HTMLAttributes<HTMLElement>;
		embed: HTMLAttributes<HTMLEmbedElement>;
		fieldset: HTMLAttributes<HTMLFieldSetElement>;
		figcaption: HTMLAttributes<HTMLElement>;
		figure: HTMLAttributes<HTMLElement>;
		footer: HTMLAttributes<HTMLElement>;
		form: HTMLAttributes<HTMLFormElement>;
		h1: HTMLAttributes<HTMLHeadingElement>;
		h2: HTMLAttributes<HTMLHeadingElement>;
		h3: HTMLAttributes<HTMLHeadingElement>;
		h4: HTMLAttributes<HTMLHeadingElement>;
		h5: HTMLAttributes<HTMLHeadingElement>;
		h6: HTMLAttributes<HTMLHeadingElement>;
		head: HTMLAttributes<HTMLHeadElement>;
		header: HTMLAttributes<HTMLElement>;
		hgroup: HTMLAttributes<HTMLElement>;
		hr: HTMLAttributes<HTMLHRElement>;
		html: HTMLAttributes<HTMLHtmlElement>;
		i: HTMLAttributes<HTMLElement>;
		iframe: HTMLAttributes<HTMLIFrameElement>;
		img: HTMLAttributes<HTMLImageElement>;
		input: HTMLAttributes<HTMLInputElement>;
		ins: HTMLAttributes<HTMLModElement>;
		kbd: HTMLAttributes<HTMLElement>;
		keygen: HTMLAttributes<HTMLUnknownElement>;
		label: HTMLAttributes<HTMLLabelElement>;
		legend: HTMLAttributes<HTMLLegendElement>;
		li: HTMLAttributes<HTMLLIElement>;
		link: HTMLAttributes<HTMLLinkElement>;
		main: HTMLAttributes<HTMLElement>;
		map: HTMLAttributes<HTMLMapElement>;
		mark: HTMLAttributes<HTMLElement>;
		marquee: HTMLAttributes<HTMLMarqueeElement>;
		menu: HTMLAttributes<HTMLMenuElement>;
		menuitem: HTMLAttributes<HTMLUnknownElement>;
		meta: HTMLAttributes<HTMLMetaElement>;
		meter: HTMLAttributes<HTMLMeterElement>;
		nav: HTMLAttributes<HTMLElement>;
		noscript: HTMLAttributes<HTMLElement>;
		object: HTMLAttributes<HTMLObjectElement>;
		ol: HTMLAttributes<HTMLOListElement>;
		optgroup: HTMLAttributes<HTMLOptGroupElement>;
		option: HTMLAttributes<HTMLOptionElement>;
		output: HTMLAttributes<HTMLOutputElement>;
		p: HTMLAttributes<HTMLParagraphElement>;
		param: HTMLAttributes<HTMLParamElement>;
		picture: HTMLAttributes<HTMLPictureElement>;
		pre: HTMLAttributes<HTMLPreElement>;
		progress: HTMLAttributes<HTMLProgressElement>;
		q: HTMLAttributes<HTMLQuoteElement>;
		rp: HTMLAttributes<HTMLElement>;
		rt: HTMLAttributes<HTMLElement>;
		ruby: HTMLAttributes<HTMLElement>;
		s: HTMLAttributes<HTMLElement>;
		samp: HTMLAttributes<HTMLElement>;
		script: HTMLAttributes<HTMLScriptElement>;
		search: HTMLAttributes<HTMLElement>;
		section: HTMLAttributes<HTMLElement>;
		select: HTMLAttributes<HTMLSelectElement>;
		slot: HTMLAttributes<HTMLSlotElement>;
		small: HTMLAttributes<HTMLElement>;
		source: HTMLAttributes<HTMLSourceElement>;
		span: HTMLAttributes<HTMLSpanElement>;
		strong: HTMLAttributes<HTMLElement>;
		style: HTMLAttributes<HTMLStyleElement>;
		sub: HTMLAttributes<HTMLElement>;
		summary: HTMLAttributes<HTMLElement>;
		sup: HTMLAttributes<HTMLElement>;
		table: HTMLAttributes<HTMLTableElement>;
		tbody: HTMLAttributes<HTMLTableSectionElement>;
		td: HTMLAttributes<HTMLTableCellElement>;
		template: HTMLAttributes<HTMLTemplateElement>;
		textarea: HTMLAttributes<HTMLTextAreaElement>;
		tfoot: HTMLAttributes<HTMLTableSectionElement>;
		th: HTMLAttributes<HTMLTableCellElement>;
		thead: HTMLAttributes<HTMLTableSectionElement>;
		time: HTMLAttributes<HTMLTimeElement>;
		title: HTMLAttributes<HTMLTitleElement>;
		tr: HTMLAttributes<HTMLTableRowElement>;
		track: HTMLAttributes<HTMLTrackElement>;
		u: HTMLAttributes<HTMLElement>;
		ul: HTMLAttributes<HTMLUListElement>;
		var: HTMLAttributes<HTMLElement>;
		video: HTMLAttributes<HTMLVideoElement>;
		wbr: HTMLAttributes<HTMLElement>;
	}
}
