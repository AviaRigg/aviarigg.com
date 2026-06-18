window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['naming-conventions'] = {
  name: 'Naming Conventions',
  category: 'Reference',
  tags: ['naming','suffix','convention','node','shader','texture'],
  isReference: true,
  desc: `Standard suffix conventions for all node types used in AviaRigg rigs.
    Consistent naming keeps rigs readable, maintainable, and scriptable.

    Nodes marked "always tag purpose" are general-purpose node types that
    commonly appear more than once per setup (e.g. multiple blendMatrix or
    condition nodes per radial joint). For these, insert a purpose word
    before the type suffix: {side}_{corner}_{index}_{purpose}_{suffix}
    e.g. l_f_outer_01_ikFollow_cond, l_f_outer_01_compress_bm,
    l_f_outer_01_squash_md, l_f_outer_01_compress_db.

    Decompose Matrix is single-purpose by default (dcm), but tag purpose
    if a setup ends up with more than one per joint (e.g. _trans_dcm,
    _rot_dcm).`,
  conventions: [
    { title: 'Transforms & Hierarchy', rows: [['Transform','transform'],['Group','grp'],['Offset','offset'],['Locator','loc'],['Connection Offset','con']] },
    { title: 'Controllers',            rows: [['Control','ctl'],['Control Offset','ctl_offset'],['Gimbal Control','gimbal_ctl'],['Set Driven Key','sdk']] },
    { title: 'Joints',                 rows: [['Joint','jnt'],['Bind Joint','bind_jnt'],['Twist Joint','twist_jnt'],['End Joint','end_jnt'],['IK Joint','ik_jnt'],['FK Joint','fk_jnt'],['Driver Joint','drv_jnt']] },
    { title: 'Geometry',               rows: [['Mesh','geo'],['NURBS Surface','nrb'],['NURBS Curve','crv']] },
    { title: 'Deformers',              rows: [['Skin Cluster','sc'],['Blendshape','bs'],['Cluster','cls'],['Lattice','lat'],['Wrap','wrap'],['Delta Mush','dm'],['Squash','squash'],['Bend','bend'],['NonLinear','nonLin']] },
    { title: 'Utility Nodes',          rows: [['Multiply Divide (always tag purpose)','md'],['Plus Minus Average','pma'],['Condition (always tag purpose)','cond'],['Clamp','clamp'],['Remap Value','rmv'],['Blend Colors','bc'],['Blend Two Attr','bta'],['Reverse','rev'],['Set Range','sr'],['Distance Between (always tag purpose)','db']] },
    { title: 'Math / Matrix',          rows: [['Sum','sum'],['Decompose Matrix (tag purpose if >1 per setup)','dcm'],['Compose Matrix','cm'],['Inverse Matrix','invMat'],['Mult Matrix','mmx'],['Blend Matrix (always tag purpose)','bm']] },
    { title: 'Constraints',            rows: [['Parent Constraint','pc'],['Point Constraint','pointCon'],['Orient Constraint','oc'],['Scale Constraint','sc'],['Aim Constraint','ac'],['Matrix Constraint','matCon'],['Proximity Pin','pin']] },
    { title: 'IK',                     rows: [['IK Handle','ikh'],['IK Effector','ike'],['Spline IK','splineIK']] },
    { title: 'Spaces & Locators',      rows: [['Local Space Locator','local_loc'],['World Space Locator','world_loc'],['Space Switch','space_sw']] },
    { title: 'Rigging Misc',           rows: [['Follicle','fol'],['Curve Info','crv_info'],['Motion Path','mpath']] },
    { title: 'Display & Organization', rows: [['Display Layer','layer'],['Set','set']] },
    { title: 'Shaders & Materials',    rows: [['Shader / Material','_mat'],['Shading Group','_mat_sg'],['File Node','_file'],['Place2D Texture','_p2d']] },
  ]
};
