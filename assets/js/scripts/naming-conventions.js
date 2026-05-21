window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['naming-conventions'] = {
  name: 'Naming Conventions',
  category: 'Reference',
  tags: ['naming','suffix','convention','node','shader','texture'],
  isReference: true,
  desc: `Standard suffix conventions for all node types used in AviaRigg rigs.
    Consistent naming keeps rigs readable, maintainable, and scriptable.`,
  conventions: [
    { title: 'Transforms & Hierarchy', rows: [['Transform','transform'],['Group','grp'],['Offset','offset'],['Locator','loc'],['Connection Offset','con']] },
    { title: 'Controllers',            rows: [['Control','ctl'],['Control Offset','ctl_offset'],['Gimbal Control','gimbal_ctl'],['Set Driven Key','sdk']] },
    { title: 'Joints',                 rows: [['Joint','jnt'],['Bind Joint','bind_jnt'],['Twist Joint','twist_jnt'],['End Joint','end_jnt'],['IK Joint','ik_jnt'],['FK Joint','fk_jnt'],['Driver Joint','drv_jnt']] },
    { title: 'Geometry',               rows: [['Mesh','geo'],['NURBS Surface','nrb'],['NURBS Curve','crv']] },
    { title: 'Deformers',              rows: [['Skin Cluster','sc'],['Blendshape','bs'],['Cluster','cls'],['Lattice','lat'],['Wrap','wrap'],['Delta Mush','dm'],['Squash','squash'],['Bend','bend'],['NonLinear','nonLin']] },
    { title: 'Utility Nodes',          rows: [['Multiply Divide','md'],['Plus Minus Average','pma'],['Condition','cond'],['Clamp','clamp'],['Remap Value','rmv'],['Blend Colors','bc'],['Blend Two Attr','bta'],['Reverse','rev'],['Set Range','sr']] },
    { title: 'Math / Matrix',          rows: [['Sum','sum'],['Decompose Matrix','dcm'],['Compose Matrix','cm'],['Inverse Matrix','invMat'],['Mult Matrix','mmx']] },
    { title: 'Constraints',            rows: [['Parent Constraint','pc'],['Point Constraint','pointCon'],['Orient Constraint','oc'],['Scale Constraint','sc'],['Aim Constraint','ac'],['Matrix Constraint','matCon']] },
    { title: 'IK',                     rows: [['IK Handle','ikh'],['IK Effector','ike'],['Spline IK','splineIK']] },
    { title: 'Spaces & Locators',      rows: [['Local Space Locator','local_loc'],['World Space Locator','world_loc'],['Space Switch','space_sw']] },
    { title: 'Rigging Misc',           rows: [['Follicle','fol'],['Curve Info','crv_info'],['Motion Path','mpath']] },
    { title: 'Display & Organization', rows: [['Display Layer','layer'],['Set','set']] },
    { title: 'Shaders & Materials',    rows: [['Shader / Material','_mat'],['Shading Group','_mat_sg'],['File Node','_file'],['Place2D Texture','_p2d']] },
  ]
};
