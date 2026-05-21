window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['fix-shape-editor'] = {
  name: 'Fix Broken Shape Editor',
  category: 'Shape Editor',
  tags: ['shape editor','blendshape','shapeEditorManager','broken','empty','fix'],
  desc: `Fixes a blank or incomplete Shape Editor caused by a duplicate <code>shapeEditorManager</code> node.
    Maya's Shape Editor UI only reads from the default node — if a second one exists (from a scene merge,
    import, or reference), blendshapes registered there will be invisible in the UI. This script reconnects
    all blendshapes to the correct node via <code>.message</code> and removes the duplicate.`,
  whenToUse: [
    'Shape Editor opens but shows 0 or only some blendshapes, even though the nodes exist in the scene.',
    'Node Editor shows two <code>shapeEditorManager</code> nodes — one connected to all blendshapes, one empty.',
    'Caused by scene merges, imports, or references creating a second manager node.',
  ],
  blocks: [
    {
      label: '// Step 1 — Diagnose: check which manager has which connections',
      id: 'code-sem-diagnose',
      code: `import maya.cmds as mc

for node in ["shapeEditorManager", "shapeEditorManager1"]:
    if not mc.objExists(node):
        print(f"{node} — does not exist")
        continue
    indices = mc.getAttr(node + ".blendShapeParent", multiIndices=True) or []
    print(f"\\n{node} — {len(indices)} blendshapes connected:")
    for i in indices:
        conn = mc.listConnections(f"{node}.blendShapeParent[{i}]", source=True, plugs=True) or []
        print(f"  [{i}]: {conn}")`
    },
    {
      label: '// Step 2 — Fix: reconnect all blendshapes via .message to primary manager',
      id: 'code-sem-fix',
      code: `import maya.cmds as mc

node = "shapeEditorManager"

indices = mc.getAttr(node + ".blendShapeParent", multiIndices=True) or []
bs_nodes = []

for i in indices:
    plug = f"{node}.blendShapeParent[{i}]"
    conns = mc.listConnections(plug, source=True, plugs=True) or []
    for c in conns:
        bs_nodes.append(c.split(".")[0])
        mc.disconnectAttr(c, plug)

for i, bs in enumerate(bs_nodes):
    mc.connectAttr(f"{bs}.message", f"{node}.blendShapeParent[{i}]", force=True)
    print(f"Fixed: {bs}.message → {node}.blendShapeParent[{i}]")

print("Done — reopen Shape Editor.")`
    }
  ],
  notes: [
    '<code>shapeEditorManager</code> is a protected Maya default node — it cannot be deleted, only the duplicate can be removed.',
    'The correct connection is <code>blendShape.message → shapeEditorManager.blendShapeParent[i]</code>. Any other plug won\'t register in the UI.',
    'Save a backup before running if your scene uses referenced rigs.',
  ]
};
