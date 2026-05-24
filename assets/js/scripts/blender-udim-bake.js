window.LIB_SCRIPT_DATA = window.LIB_SCRIPT_DATA || {};
window.LIB_SCRIPT_DATA['blender-udim-bake'] = {
  name: 'UDIM → Single UV Bake (Sketchfab)',
  category: 'Blender',
  tags: ['blender','bake','udim','sketchfab','texture','uv','cycles','python'],
  desc: `Full workflow for collapsing a multi-tile UDIM texture set down to a single UV bake in Blender (Cycles).
    Designed for exporting complex models (e.g. F1 cars with 10–50+ materials) to Sketchfab or any
    real-time engine that doesn't support UDIM. Run each script block in Blender's Scripting tab in order.`,
  blocks: [
    {
      label: '// Step 1 — Create bake UV map',
      id: 'code-bake-uv',
      code: `import bpy

# Adds a second UV map called "Sketchfab" to every mesh object.
# This is the UV channel we bake ONTO — keep your original UDIM map (map1) untouched.

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    uv_maps = obj.data.uv_layers
    if "Sketchfab" not in [uv.name for uv in uv_maps]:
        uv_maps.new(name="Sketchfab")
        print(f"Added Sketchfab UV to: {obj.name}")
    else:
        print(f"Already exists on: {obj.name}")

print("Done — Sketchfab UV map added to all meshes")`
    },
    {
      label: '// Step 2 — Unwrap all meshes to bake UV',
      id: 'code-unwrap',
      code: `import bpy

# Smart UV Project unwrap on the "Sketchfab" UV map for every mesh.
# This gives a clean single-tile 0-1 layout to bake onto.
# Run AFTER Step 1.

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Set Sketchfab as active UV
    uv_maps = obj.data.uv_layers
    if "Sketchfab" in [uv.name for uv in uv_maps]:
        uv_maps.active = uv_maps["Sketchfab"]
    else:
        print(f"No Sketchfab UV on {obj.name} — skipping")
        continue

    # Enter edit mode and Smart UV Project
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66, island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.select_set(False)
    print(f"Unwrapped: {obj.name}")

print("Done — all meshes unwrapped to Sketchfab UV")`
    },
    {
      label: '// Step 3 — Create bake target image',
      id: 'code-create-image',
      code: `import bpy

# Creates a blank 8K image in Blender's image datablock to bake into.
# Change the name and resolution to match your map type:
#   Diffuse   -> "MyModel_Bake_Diffuse"
#   Roughness -> "MyModel_Bake_Roughness"
#   Normal    -> "MyModel_Bake_Normal"
#   Metallic  -> "MyModel_Bake_Metallic"

IMAGE_NAME = "MyModel_Bake_Diffuse"  # <-- change per map type
RESOLUTION = 8192                     # <-- 4096 or 8192

if IMAGE_NAME in bpy.data.images:
    bpy.data.images.remove(bpy.data.images[IMAGE_NAME])

bake_image = bpy.data.images.new(
    name=IMAGE_NAME,
    width=RESOLUTION,
    height=RESOLUTION,
    alpha=False
)

print(f"Created: {IMAGE_NAME} at {RESOLUTION}x{RESOLUTION}")`
    },
    {
      label: '// Step 4 — Inject BAKE_TARGET node into all materials',
      id: 'code-inject-node',
      code: `import bpy

# Injects an unconnected Image Texture node labelled BAKE_TARGET into every material.
# Blender bakes onto whichever image texture node is active — this sets that up
# automatically across all materials instead of doing it manually per slot.
#
# IMPORTANT: Run Step 3 first so the image exists. Update IMAGE_NAME to match.

IMAGE_NAME = "MyModel_Bake_Diffuse"  # <-- must match Step 3

if IMAGE_NAME not in bpy.data.images:
    print(f"ERROR: Image '{IMAGE_NAME}' not found. Run Step 3 first.")
else:
    bake_image = bpy.data.images[IMAGE_NAME]
    count = 0

    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        nodes = mat.node_tree.nodes

        # Remove any old BAKE_TARGET nodes first (clean re-run)
        for node in list(nodes):
            if node.label == "BAKE_TARGET":
                nodes.remove(node)

        # Add fresh Image Texture node — disconnected, just needs to be active
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = bake_image
        tex_node.label = "BAKE_TARGET"
        tex_node.location = (-300, -500)

        # Make it the active node so Blender knows where to bake
        for n in nodes:
            n.select = False
        tex_node.select = True
        mat.node_tree.nodes.active = tex_node
        count += 1

    print(f"Done — BAKE_TARGET added to {count} materials")`
    },
    {
      label: '// Step 5 — Switch active UV to Sketchfab on all meshes',
      id: 'code-set-active-uv',
      code: `import bpy

# Before baking, the "Sketchfab" UV must be active (not map1/UDIM).
# Run this right before hitting Bake in the Render Properties panel.

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    uv_maps = obj.data.uv_layers
    if "Sketchfab" in [uv.name for uv in uv_maps]:
        uv_maps.active = uv_maps["Sketchfab"]
        print(f"Active UV set to Sketchfab: {obj.name}")
    else:
        print(f"WARNING: No Sketchfab UV on {obj.name}")

print("Done — Sketchfab UV active on all meshes")
print("Now go to Render Properties > Bake and hit Bake.")`
    },
    {
      label: '// Step 6 — Save all baked images to disk',
      id: 'code-save-images',
      code: `import bpy
import os

# Saves every image whose name starts with "MyModel_Bake_" to a folder on disk.
# Run after each bake completes, or once at the end to save all maps at once.
# Change OUTPUT_DIR and PREFIX to match your project.

OUTPUT_DIR = "C:/Users/YourName/Desktop/Bakes/"  # <-- your output folder
PREFIX     = "MyModel_Bake_"                       # <-- matches your image names

os.makedirs(OUTPUT_DIR, exist_ok=True)

saved = 0
for img in bpy.data.images:
    if not img.name.startswith(PREFIX):
        continue
    filepath = os.path.join(OUTPUT_DIR, img.name + ".png")
    img.filepath_raw = filepath
    img.file_format = 'PNG'
    img.save()
    print(f"Saved: {filepath}")
    saved += 1

if saved == 0:
    print(f"No images found with prefix '{PREFIX}' — check Step 3 image names.")
else:
    print(f"Done — {saved} image(s) saved to {OUTPUT_DIR}")`
    },
    {
      label: '// Utility — Re-inject node for a different map type',
      id: 'code-swap-target',
      code: `import bpy

# Quick utility to swap the BAKE_TARGET image across all materials.
# Use between bake passes (e.g. after Diffuse, before Roughness).
# Run Step 3 first to create the new image, then run this.

IMAGE_NAME = "MyModel_Bake_Roughness"  # <-- change to next map

if IMAGE_NAME not in bpy.data.images:
    print(f"ERROR: '{IMAGE_NAME}' not found. Run Step 3 first.")
else:
    bake_image = bpy.data.images[IMAGE_NAME]
    count = 0

    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.node_tree:
            continue
        nodes = mat.node_tree.nodes
        for node in nodes:
            if node.label == "BAKE_TARGET":
                node.image = bake_image
                for n in nodes:
                    n.select = False
                node.select = True
                mat.node_tree.nodes.active = node
                count += 1
                break

    print(f"Swapped BAKE_TARGET to '{IMAGE_NAME}' across {count} materials")`
    }
  ],
  params: [
    { name: 'IMAGE_NAME', type: 'str',  desc: 'Name of the bake target image — change per map type (Diffuse, Roughness, Normal, Metallic)' },
    { name: 'RESOLUTION', type: 'int',  desc: 'Bake resolution in pixels. 4096 or 8192 recommended for Sketchfab' },
    { name: 'OUTPUT_DIR', type: 'str',  desc: 'Absolute path to folder where baked PNGs will be saved' },
    { name: 'PREFIX',     type: 'str',  desc: 'Image name prefix used to find and save all bake maps at once' },
  ],
  notes: [
    'Run all scripts in Blender\'s Scripting tab in order: Step 1 → 2 → 3 → 4 → 5 → Bake → 6.',
    'Renderer must be set to Cycles — baking is not supported in EEVEE.',
    'In Render Properties > Bake: set Bake Type to Diffuse, uncheck Direct and Indirect, leave only Color checked.',
    'Selected to Active must be OFF unless baking from a high-poly to a low-poly mesh.',
    'The BAKE_TARGET node must NOT be connected to anything — Blender just needs it to be the active node.',
    'For Roughness bakes: use Bake Type = Roughness. For Metallic: use Bake Type = Glossy (closest equivalent).',
    'Repeat Steps 3 → 4 (Utility swap) → Bake → 6 for each map type: Diffuse, Roughness, Normal, Metallic.',
    'Sketchfab compresses textures in the viewer — 8K bakes are overkill, 4K is usually sufficient.',
    'If bake is stuck at 0%: make sure the mesh is selected (orange) in the viewport before hitting Bake.',
    'GPU baking (RTX etc.) is much faster — enable it in Preferences > System > Cycles Render Devices.',
  ]
};
