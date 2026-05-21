window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['mirror-nonlinear'] = {
  name: 'Mirror NonLinear Deformer Weights',
  category: 'Deformers',
  tags: ['deformer','mirror','weights','nonlinear'],
  desc: `Mirrors painted deformer weights left→right across the YZ plane on a symmetrical mesh.
    Uses <code>closestPoint</code> surface association — required for nonLinear deformers in Maya 2022+.
    The old Relationship Editor method no longer works.`,
  blocks: [
    {
      label: '// Script',
      id: 'code-mirror-nonlinear',
      code: `import maya.cmds as cmds

cmds.copyDeformerWeights(
    sourceDeformer="head_bend_lo",        # replace with your deformer name
    destinationDeformer="head_bend_lo",   # same deformer
    sourceShape="Bdt_Body_FinalShape",    # replace with your mesh shape node
    destinationShape="Bdt_Body_FinalShape",
    mirrorMode="YZ",                      # YZ = left/right (Z forward, Y up)
    mirrorInverse=False,                  # flip to True if wrong direction
    surfaceAssociation="closestPoint"     # critical — vertex ID fails on nonLinear
)`
    }
  ],
  params: [
    { name: 'sourceDeformer',     type: 'str',  desc: 'Name of the nonLinear deformer node' },
    { name: 'mirrorMode',         type: 'str',  desc: '"YZ" for left/right. Use "XY" or "XZ" for other orientations.' },
    { name: 'mirrorInverse',      type: 'bool', desc: 'False = left→right. True = right→left.' },
    { name: 'surfaceAssociation', type: 'str',  desc: '"closestPoint" is required — vertex ID fails on nonLinear.' },
  ],
  notes: [
    'The old Maya 2020 method (Relationship Editor → Deformer Sets) no longer works in Maya 2022+.',
    'Mesh must be symmetrical.',
    'Do NOT use influenceAssociation — that is skinCluster only and will error.',
    'Always save before running mirror operations on weights.',
  ]
};
