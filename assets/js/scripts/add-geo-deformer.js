export default {
  name: 'Add Geometry to Deformer',
  category: 'Deformers',
  tags: ['deformer','geometry','nonlinear','controllers'],
  desc: `Adds a geometry group (e.g. controller shapes under <code>ctl_grp</code>) to an existing nonLinear deformer.
    Replacement for the old Relationship Editor method, which no longer works in Maya 2022+.`,
  blocks: [
    {
      label: '// Simple — add entire group',
      id: 'code-add-geo-simple',
      code: `import maya.cmds as cmds

cmds.deformer("head_squash", edit=True, geometry="ctl_grp")
# replace "head_squash" with your deformer name
# replace "ctl_grp" with your group or geometry name`
    },
    {
      label: '// Verbose — add individual shapes with error handling',
      id: 'code-add-geo-verbose',
      code: `import maya.cmds as cmds

ctls = cmds.listRelatives("ctl_grp", allDescendants=True, type="nurbsCurve")

for shape in ctls:
    try:
        cmds.deformer("head_squash", edit=True, geometry=shape)
    except Exception as e:
        print(f"Skipped {shape}: {e}")`
    },
    {
      label: '// Add with Exclusions',
      sublabel: 'Add an entire group then remove specific hierarchies.',
      id: 'code-add-geo-exclude',
      code: `import maya.cmds as cmds

cmds.deformer("jaw_bend", edit=True, geometry="ctl_grp")

exclude_roots = [
    "l_ear_master_ctl",
    "r_ear_master_ctl",
    "jaw_deformer_ctl",
]

for root in exclude_roots:
    descendants = cmds.listRelatives(root, allDescendents=True, type="nurbsCurve", fullPath=True) or []
    shapes = cmds.listRelatives(root, shapes=True, type="nurbsCurve", fullPath=True) or []
    for shape in list(set(descendants + shapes)):
        try:
            cmds.deformer("jaw_bend", edit=True, remove=True, geometry=shape)
        except Exception as e:
            print(f"Skipped {shape}: {e}")

print("Done")`
    }
  ],
  notes: [
    'In Maya 2022+, the Relationship Editor no longer shows nonLinear deformer sets.',
    'Use the simple version first — only use verbose if simple errors on nurbs curves.',
    '<code>allDescendents</code> — Maya uses an \'e\', not \'a\'.',
    '<code>fullPath=True</code> is required to avoid name collision errors.',
  ]
};
