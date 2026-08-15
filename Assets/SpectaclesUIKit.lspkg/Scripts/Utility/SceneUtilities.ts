@typedef
export class Callback {
  @input
  @allowUndefined
  public scriptComponent: ScriptComponent
  @input
  @allowUndefined
  public functionName: string
}

/**
 * Searches for components with the given type in the tree rooted at the given root SceneObject.
 *
 * @param root - The root SceneObject of the tree to search.
 * @param name - The component typename to search for.
 * @returns An array of the components with that type
 *
 * @deprecated Use findAllComponentsInSelfOrChildren from SpectaclesInteractionKit.lspkg/Utils/SceneObjectUtils instead.
 */
export function findAllChildComponents(root: SceneObject | null, name: keyof ComponentNameMap): Component[] {
  const children = root?.children ?? getSceneRoots()
  const components = root?.getComponents(name) ?? []
  components.push(...children.flatMap((c) => findAllChildComponents(c, name)))
  return components
}

/**
 * Searches for components with the given type in the tree rooted at the given root SceneObject.
 *
 * @param root - The root SceneObject of the tree to search.
 * @param name - The component typename to search for.
 * @returns An array of the components with that type
 *
 * @deprecated Use findComponentInSelfOrParents from SpectaclesInteractionKit.lspkg/Utils/SceneObjectUtils instead.
 */
export function findComponentInAncestors(start: SceneObject, name: keyof ComponentNameMap): Component {
  let parent = start
  let component = null
  while (parent !== null) {
    component = parent.getComponent(name)
    if (component) break
    parent = parent.getParent()
  }

  return component
}

/**
 * Returns an array of all root objects in the scene.
 */
export function getSceneRoots(): SceneObject[] {
  const nodes: SceneObject[] = []
  for (let i = 0; i < global.scene.getRootObjectsCount(); i++) {
    nodes.push(global.scene.getRootObject(i))
  }
  return nodes
}

export function createCallbacks<T>(callbacks: Callback[]): (args: T) => void {
  if (callbacks === undefined || callbacks.length === 0) {
    return () => {}
  }
  return (args) => {
    for (let i = 0; i < callbacks.length; i++) {
      if ((callbacks[i].scriptComponent as any)[callbacks[i].functionName as any]) {
        ;(callbacks[i].scriptComponent as any)[callbacks[i].functionName as any](args)
      }
    }
  }
}
