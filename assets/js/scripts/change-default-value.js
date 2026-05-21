window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['change-default-value'] = {
  name: 'Change Default Attribute Value',
  category: 'Attributes',
  tags: ['attribute','default','value','enum'],
  desc: `Changes the default value of an existing attribute on a node. Useful for enum attributes
    where you want the default to be something other than 0. Works on any numeric or enum attribute.`,
  blocks: [
    {
      label: '// Script',
      id: 'code-change-default',
      code: `import maya.cmds as cmds

cmds.addAttr("your_node.your_attribute", edit=True, defaultValue=1)
# replace "your_node" with your node name
# replace "your_attribute" with your attribute name
# replace 1 with your desired default value`
    }
  ],
  params: [
    { name: 'node.attribute', type: 'str',   desc: 'The node and attribute in dot notation (e.g. "head_ctl.tweak")' },
    { name: 'edit',           type: 'bool',  desc: 'Must be True to modify an existing attribute' },
    { name: 'defaultValue',   type: 'float', desc: 'The new default value. For enums: 0 = first, 1 = second, etc.' },
  ],
  notes: [
    'For enum attributes, the default value is the index — 0 = first enum, 1 = second, etc.',
    'This only changes the default — not the current value. Use setAttr separately if needed.',
  ]
};
