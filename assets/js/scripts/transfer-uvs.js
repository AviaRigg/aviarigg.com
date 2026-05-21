export default {
  name: 'Transfer UVs',
  category: 'UVs',
  tags: ['uv','uvs','transfer','polyTransfer'],
  desc: `Transfer UVs from one mesh to multiple others using <code>polyTransfer</code>.
    Select the source mesh first, then shift-select all target meshes. Run the script.`,
  blocks: [
    {
      label: '// Script',
      sublabel: 'Select source mesh first → shift-select targets → run',
      id: 'code-transfer-uvs',
      code: `import maya.cmds as mc

selection = mc.ls(sl=True)
for i, x in enumerate(selection):
    if i != 0:
        mc.polyTransfer(selection[i], uvSets=True, ao=selection[0], constructionHistory=False)
        mc.warning("uvs transfered correctly")`
    }
  ],
  notes: [
    'Selection order matters — first selected is always the source.',
    'Requires identical topology between source and targets.',
    '<code>constructionHistory=False</code> keeps the scene clean.',
  ]
};
