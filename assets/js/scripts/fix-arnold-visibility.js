export default {
  name: 'Fix Arnold Mesh Visibility',
  category: 'Arnold / Viewport',
  tags: ['arnold','visibility','primaryVisibility','render','invisible'],
  desc: `Restores Arnold render visibility flags on a mesh that appears invisible in the Arnold viewport
    even though it is not hidden in the outliner. Caused by Arnold's <code>primaryVisibility</code>,
    <code>visibleInReflections</code>, and <code>visibleInRefractions</code> flags being silently set
    to <code>False</code> — commonly triggered by blend shape target editing sessions.`,
  blocks: [
    {
      label: '// Diagnose — check visibility flags',
      id: 'code-arnold-check',
      code: `import maya.cmds as mc

shape = "Bdt_Body_FinalShape"  # replace with your shape node name
print("primaryVisibility  :", mc.getAttr(shape + ".primaryVisibility"))
print("visibleInReflections:", mc.getAttr(shape + ".visibleInReflections"))
print("visibleInRefractions:", mc.getAttr(shape + ".visibleInRefractions"))`
    },
    {
      label: '// Fix — restore flags on a single mesh',
      id: 'code-arnold-fix',
      code: `import maya.cmds as mc

shape = "Bdt_Body_FinalShape"  # replace with your shape node name
mc.setAttr(shape + ".primaryVisibility",    True)
mc.setAttr(shape + ".visibleInReflections", True)
mc.setAttr(shape + ".visibleInRefractions", True)
print(f"[AviaRigg] Arnold visibility restored on {shape}")`
    },
    {
      label: '// Fix All — restore flags on every affected mesh in scene',
      sublabel: 'Safe to run as a post-blend-shape sanity check.',
      id: 'code-arnold-fix-all',
      code: `import maya.cmds as mc

fixed = []
for shape in mc.ls(type="mesh"):
    if mc.attributeQuery("primaryVisibility", node=shape, exists=True):
        if not mc.getAttr(shape + ".primaryVisibility"):
            mc.setAttr(shape + ".primaryVisibility",    True)
            mc.setAttr(shape + ".visibleInReflections", True)
            mc.setAttr(shape + ".visibleInRefractions", True)
            fixed.append(shape)

print(f"[AviaRigg] Fixed {len(fixed)} mesh(es): {fixed}")`
    }
  ],
  params: [
    { name: 'primaryVisibility',    type: 'bool', desc: 'Controls whether Arnold renders the mesh at all. False = invisible in Arnold viewport and final render.' },
    { name: 'visibleInReflections', type: 'bool', desc: 'Whether the mesh appears in reflections on other surfaces.' },
    { name: 'visibleInRefractions', type: 'bool', desc: 'Whether the mesh appears in refractions through transparent materials.' },
  ],
  notes: [
    'These are Arnold-specific attributes — they have no effect in Viewport 2.0.',
    'The flags are silently set to False during blend shape target editing. Exiting edit mode does not restore them.',
    'The shape node name ends in "Shape" — find it in the Attribute Editor tab.',
    'Run "Fix All" after any blend shape editing session as a sanity check.',
  ]
};
