window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['maya-joint-align-pca'] = {
  name: 'Joint Align to Mesh (PCA)',
  category: 'Maya',
  tags: ['maya', 'rigging', 'joint', 'pca', 'freeze transform', 'orient', 'disc', 'rotation', 'python'],
  desc: `Aligns a joint to the geometric center and primary axis of any disc-shaped mesh — wheels, gears,
    rotors, turbines, hinges, pulleys — even when the mesh has fully frozen transforms with no visible
    rotation values in the Channel Box.
    Uses PCA (Principal Component Analysis) on the vertex point cloud to detect the thin axis of the shape,
    which corresponds to the spin/rotation axis. The result is baked directly into jointOrient, keeping
    Rotate at 0,0,0. Select the joint first, then the mesh, and run.`,
  blocks: [
    {
      label: '// Align joint to mesh via PCA',
      id: 'code-align-joint',
      code: `import maya.cmds as cmds
import maya.api.OpenMaya as om
import math

def align_joint_to_mesh_geometry():
    sel = cmds.ls(selection=True)

    if len(sel) != 2:
        cmds.error("Select exactly: joint first, then mesh.")
        return

    joint = sel[0]
    mesh  = sel[1]

    if cmds.nodeType(joint) != "joint":
        cmds.error(f"{joint} is not a joint.")
        return
    if not cmds.listRelatives(mesh, shapes=True, type="mesh"):
        cmds.error(f"{mesh} has no mesh shape.")
        return

    # --- POSITION: bounding box center ---
    bb = cmds.xform(mesh, query=True, boundingBox=True, worldSpace=True)
    cx = (bb[0] + bb[3]) / 2
    cy = (bb[1] + bb[4]) / 2
    cz = (bb[2] + bb[5]) / 2

    # --- GET ALL VERTEX POSITIONS ---
    shape    = cmds.listRelatives(mesh, shapes=True, type="mesh")[0]
    sel_list = om.MSelectionList()
    sel_list.add(shape)
    dag      = sel_list.getDagPath(0)
    mesh_fn  = om.MFnMesh(dag)
    points   = mesh_fn.getPoints(om.MSpace.kWorld)

    # --- FIT PLANE via PCA on vertex positions ---
    # Build covariance matrix of vertex positions relative to bounding box center
    n   = len(points)
    cov = [[0.0, 0.0, 0.0],
           [0.0, 0.0, 0.0],
           [0.0, 0.0, 0.0]]

    for p in points:
        dx = p.x - cx
        dy = p.y - cy
        dz = p.z - cz
        cov[0][0] += dx * dx;  cov[0][1] += dx * dy;  cov[0][2] += dx * dz
        cov[1][0] += dy * dx;  cov[1][1] += dy * dy;  cov[1][2] += dy * dz
        cov[2][0] += dz * dx;  cov[2][1] += dz * dy;  cov[2][2] += dz * dz

    for i in range(3):
        for j in range(3):
            cov[i][j] /= n

    # Power iteration to find the SMALLEST eigenvector
    # For any flat/disc-like shape, the smallest variance axis = the normal = rotation axis
    def power_iteration_smallest(cov, iterations=200):
        import random
        random.seed(42)

        def normalize(v):
            mag = math.sqrt(sum(x*x for x in v))
            return [x / mag for x in v] if mag > 1e-10 else v

        def mat_vec(m, v):
            return [
                m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
                m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
                m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2],
            ]

        def dot(a, b):
            return sum(x*y for x, y in zip(a, b))

        eigenvectors = []
        working_cov  = [row[:] for row in cov]

        for _ in range(3):
            v = normalize([random.random(), random.random(), random.random()])
            for _ in range(iterations):
                v = normalize(mat_vec(working_cov, v))
            eigenvalue = dot(mat_vec(working_cov, v), v)
            eigenvectors.append((eigenvalue, v))
            for i in range(3):
                for j in range(3):
                    working_cov[i][j] -= eigenvalue * v[i] * v[j]

        # Smallest eigenvalue = axis of least spread = rotation axis of a disc
        eigenvectors.sort(key=lambda x: x[0])
        return eigenvectors[0][1]

    primary_axis = power_iteration_smallest(cov)
    aim          = om.MVector(*primary_axis).normal()

    # --- BUILD ORTHONORMAL BASIS from detected axis ---
    # aim = X axis (rotation axis), Y and Z fill the plane
    world_up = om.MVector(0, 1, 0)
    if abs(aim * world_up) > 0.99:
        world_up = om.MVector(0, 0, 1)

    right = (aim ^ world_up).normal()   # Z axis
    up    = (right ^ aim).normal()       # Y axis

    mat = om.MMatrix([
        aim.x,   aim.y,   aim.z,   0,
        up.x,    up.y,    up.z,    0,
        right.x, right.y, right.z, 0,
        0,       0,       0,       1
    ])

    tm    = om.MTransformationMatrix(mat)
    euler = tm.rotation(asQuaternion=False)
    rx    = math.degrees(euler.x)
    ry    = math.degrees(euler.y)
    rz    = math.degrees(euler.z)

    # --- APPLY to joint ---
    # Temporarily unparent to edit cleanly in world space
    parent = cmds.listRelatives(joint, parent=True)
    if parent:
        joint = cmds.parent(joint, world=True)[0]

    cmds.xform(joint, translation=[cx, cy, cz], worldSpace=True)
    cmds.setAttr(f"{joint}.rotate", 0, 0, 0)
    cmds.setAttr(f"{joint}.jointOrientX", rx)
    cmds.setAttr(f"{joint}.jointOrientY", ry)
    cmds.setAttr(f"{joint}.jointOrientZ", rz)

    if parent:
        cmds.parent(joint, parent[0])

    print(f"[AlignJoint] '{joint}' aligned to '{mesh}' via geometry PCA")
    print(f"  Position     : {cx:.4f}, {cy:.4f}, {cz:.4f}")
    print(f"  Rotation axis: {aim.x:.4f}, {aim.y:.4f}, {aim.z:.4f}")
    print(f"  Orient       : {rx:.4f}, {ry:.4f}, {rz:.4f}")

align_joint_to_mesh_geometry()`
    }
  ],
  params: [
    { name: 'joint', type: 'str', desc: 'First selected object — must be a joint node' },
    { name: 'mesh',  type: 'str', desc: 'Second selected object — must be a mesh with a shape node' },
  ],
  notes: [
    'Select the joint first, then the mesh, then run.',
    'Works on meshes with fully frozen transforms — no rotation values in the Channel Box needed.',
    'Best suited for disc-like or cylindrical shapes: wheels, gears, rotors, turbines, pulleys, hinges.',
    'PCA finds the axis of least vertex spread — on a flat disc this is the rotation/spin axis.',
    'Any incline or tilt baked into the mesh at modelling time is detected and reflected in the joint orient.',
    'Joint is temporarily unparented to world space during alignment, then re-parented to its original parent.',
    'Orientation is baked into jointOrientX/Y/Z — Rotate stays at 0,0,0, which is correct for rigging.',
    'Check the printed rotation axis in the Script Editor — a clean (1,0,0) means no tilt was detected.',
    'Does NOT work well on roughly spherical or box-like meshes where all three axes have similar spread.',
    'If the mesh has a parent group carrying the tilt (not frozen), the world matrix approach is sufficient — PCA is specifically for geometry-baked orientations.',
  ]
};
