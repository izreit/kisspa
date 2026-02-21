# API reference

## Reactivity primitives

- [createStore()](./create-store.md) - Create a store with fine-grained tracking.
- [createSignal()](./create-signal.md) - Fine-grained getter/setter pair for scalar state.
- [createEffect()](./create-effect.md) - Create an effect.
- [memoize()](./memoize.md) - Cache computations across reactive reads.

## Rendering and control flow

- [attach()](./attach.md) - Mount a JSX tree into a DOM container.
- [\<Show />](./show.md) - Conditional rendering.
- [\<Switch /> / \<Match />](./switch.md) - Conditional rendering for multiple branches.
- [\<Dynamic />](./dynamic.md) - Dynamically determined component rendering
- [\<For />](./for.md) - Efficient list rendering over arrays or iterables.
- [\<Suspense />](./suspense.md) - Defer UI until async data resolves.
- [\<Portal />](./portal.md), [\<PortalDest />](./portal-dest.md) - Render JSX into another DOM subtree.

## Lifecycle, ref and contexts

- [createContext()](./create-context.md), [useContext()](./use-context.md) - Share state down the tree.
- [createRef()](./create-ref.md) - Track mutable references to DOM elements or data.
- [onMount()](./on-mount.md), [onCleanup()](./on-cleanup.md) - Register a hook tied to component creation and destruction.
- [useComponentMethods()](./use-component-methods.md) - Obtain lifecycle methods for async code.

## Types and utilities

- [deprop()](./deprop.md) - prop resolver utility.
- [JSXNode](./jsx-node.md) - Types describing elements returned from JSX.
- [Prop](./prop.md) - Type for prop.
- [PropChildren](./prop-children.md) - Type for children of components.

## Styling

- [$()](./dollar.md) - Utility-first CSS generator.

## Advanced/minor features

- [createRoot()](./create-root.md) - Scope lifecycle tracking for a subtree.
- [createUpwind()](./create-upwind.md) - Create an Upwind utility-first CSS generator instance.
- [presetColors](./preset-colors.md) - Optional Tailwind compatible color palette.

## Less-used reactivity tools

- [bindObserver()](./bind-observer.md) - Bind observer for asynchronous work.
- [cancelEffect()](./cancel-effect.md) - Stop a running effect manually.
- [createDecimatedEffect()](./create-decimated-effect.md) - Reactive side effects with throttling.
- [decimated()](./decimated.md) - Utility to wrap a function to be throttled.
- [requestFlush()](./request-flush.md) - Schedule a microtask flush of pending reactions.
- [unwrap()](./unwrap.md) - Extract plain values out of nested signals/stores.
- [watchProbe()](./watch-probe.md) - Create an effect for aggregated values.
- [withoutObserver()](./without-observer.md) - Run code without tracking reactive dependencies.
