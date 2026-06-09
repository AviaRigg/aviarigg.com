window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['maya-offset-group'] = {
  name: 'Create Offset Group',
  category: 'Rigging',
  tags: ['maya','rigging','offset','group','freeze,transform','zero,out','pivot','python'],
  desc: `Creates an offset (freeze) group above any selected node — joint, controller, mesh, locator, etc.
    The group is placed at the exact world position and orientation of the node, effectively zeroing out
    the node's transforms without using Freeze Transformations. The node's local translate, rotate, and scale
    become 0, 0, 0 / 0, 0, 0 / 1, 1, 1 relative to the group.
    The group is named after the node with an _off suffix and inherits the same pivot.
    Works on multiple selected nodes at once.`,
  blocks: [
    {
      label: '// Create offset group',
      id: 'code-offset-group',
      code: `import maya.cmds as cmds

def create_offset_group():
    sel = cmds.ls(selection=True, long=True)

    if not sel:
        cmds.error("Nothing selected.")
        return

    created = []

    for node in sel:
        short = node.split("|")[-1]

        # --- Build group name ---
        # Strip existing namespace for naming, keep full path for ops
        base_name = short.split(":")[-1]
        grp_name  = base_name + "_off"

        # --- Get world transform of node ---
        pos = cmds.xform(node, query=True, worldSpace=True, translation=True)
        rot = cmds.xform(node, query=True, worldSpace=True, rotation=True)
        # Pivot in world space
        piv = cmds.xform(node, query=True, worldSpace=True, rotatePivot=True)

        # --- Get current parent ---
        parent = cmds.listRelatives(node, parent=True, fullPath=True)

        # --- Create group ---
        grp = cmds.group(empty=True, name=grp_name, world=True)

        # Match group to node's world transform
        cmds.xform(grp, worldSpace=True, translation=pos)
        cmds.xform(grp, worldSpace=True, rotation=rot)

        # Match pivot exactly
        cmds.xform(grp, worldSpace=True, rotatePivot=piv)
        cmds.xform(grp, worldSpace=True, scalePivot=piv)

        # --- Insert group into hierarchy ---
        if parent:
            cmds.parent(grp, parent[0])

        cmds.parent(node, grp)

        # --- Zero out the node's local transforms ---
        # After parenting, local translate/rotate should already be ~0
        # but we force it to be exact in case of float drift
        for attr in ['tx','ty','tz','rx','ry','rz']:
            try:
                cmds.setAttr(f"{node}.{attr}", 0)
            except Exception:
                pass  # locked or connected attrs are skipped silently
        for attr in ['sx','sy','sz']:
            try:
                cmds.setAttr(f"{node}.{attr}", 1)
            except Exception:
                pass

        created.append(grp)
        print(f"[OffsetGroup] '{short}' → '{grp_name}'")

    cmds.select(created)
    print(f"[OffsetGroup] Done — {len(created)} group(s) created.")

create_offset_group()`
    }
  ],
  params: [
    { name: 'node', type: 'str', desc: 'Any selected node — joint, controller, mesh, locator, group. Multi-select supported.' },
  ],
  notes: [
    'Select one or more nodes and run — works on any node type.',
    'The offset group is named <node>_off and inserted directly above the node in the hierarchy.',
    'Group is placed at the exact world position and rotation of the node before parenting.',
    'Rotate and scale pivots are matched so the group and node share the same pivot point.',
    'After parenting, local translate/rotate/scale on the node are forced to 0/0/0, 0/0/0, 1/1/1.',
    'If a transform attribute is locked or connected, it is skipped silently — unlock it manually if needed.',
    'The node\'s existing parent is preserved — the group slots in between the node and its original parent.',
    'Running twice on the same node will create a second _off group — check before re-running.',
    'Useful as a rigging convention alternative to Freeze Transformations, which can break skin weights and history.',
  ]
};
