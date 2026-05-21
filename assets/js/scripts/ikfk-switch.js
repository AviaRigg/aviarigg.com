export default {
  name: 'IK / FK Switch with Match',
  category: 'IK / FK',
  tags: ['ik','fk','switch','match','arm','IKFK'],
  desc: `Toggles the arm between IK and FK while preserving pose via <code>matchTransform</code>.
    Assign to a picker button for one-click switching during animation.`,
  blocks: [
    {
      label: '// Script',
      id: 'code-ikfk',
      code: `import maya.cmds as mc

ikfk = mc.getAttr('l_arm_settings_ctl.IKFK')

if ikfk == 0:
    # FK → IK
    mc.setAttr('l_arm_settings_ctl.IKFK', 1)
    mc.matchTransform('l_shoulder_fk_ctl', 'l_shoulder_ik_jnt')
    mc.matchTransform('l_elbow_fk_ctl',    'l_elbow_ik_jnt')
    mc.matchTransform('l_wrist_fk_ctl',    'l_wrist_ik_jnt')
else:
    # IK → FK
    mc.setAttr('l_arm_settings_ctl.IKFK', 0)
    mc.matchTransform('l_wrist_ik_ctl',    'l_wrist_fk_jnt')
    mc.matchTransform('l_elbow_ik_ctl',    'l_elbow_fk_jnt')
    mc.matchTransform('l_shoulder_ik_ctl', 'l_shoulder_fk_jnt')`
    }
  ],
  notes: [
    '<code>IKFK = 0</code> is FK mode, <code>IKFK = 1</code> is IK mode.',
    'Node names are hardcoded for the Nordic Bandit rig left arm — update to match your rig.',
    'For referenced rigs, prepend the namespace: <code>\'NordBand:l_arm_settings_ctl\'</code>.',
    'Assign to a picker button in MGPicker Studio for one-click switching.',
  ]
};
