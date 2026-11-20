extends CharacterBody3D

@export var walk_speed := 6.0
@export var run_speed := 10.5
@export var jump_velocity := 8.0
@export var gravity := 24.0

var camera_pivot: Node3D
var camera: Camera3D
var yaw := 0.0
var pitch := -0.25
var camera_mode := "third"
var mouse_captured := true
var stamina := 100.0
var world_active := false
var avatar_visual: Node3D
var arm_pivots: Array[Node3D] = []
var forearm_pivots: Array[Node3D] = []
var thigh_pivots: Array[Node3D] = []
var shin_pivots: Array[Node3D] = []
var foot_pivots: Array[Node3D] = []
var breathing_parts: Array[MeshInstance3D] = []
var breathing_scales: Array[Vector3] = []
var gait_phase := 0.0
var gait_amount := 0.0
var avatar_clock := 0.0
var human_part_index := 0


func _ready() -> void:
	collision_layer = 1
	collision_mask = 1
	global_position = Vector3(0.0, 1.2, 12.0)

	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.38
	capsule.height = 1.8
	shape.shape = capsule
	shape.position.y = 0.9
	add_child(shape)

	_build_human_avatar()

	camera_pivot = Node3D.new()
	camera_pivot.name = "CameraPivot"
	camera_pivot.position = Vector3(0.0, 1.45, 0.0)
	add_child(camera_pivot)

	camera = Camera3D.new()
	camera.name = "CreatorCamera"
	camera.current = true
	camera_pivot.add_child(camera)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	set_camera_mode("third")


func _blender_to_godot(point: Vector3) -> Vector3:
	return Vector3(point.x, point.z, point.y)


func _create_human_material(name: String, color: Color, roughness: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.resource_name = name
	material.albedo_color = color
	material.roughness = roughness
	return material


func _unique_human_name(name: String) -> String:
	human_part_index += 1
	return "%s_%03d" % [name, human_part_index]


func _add_human_sphere(parent: Node3D, name: String, blender_position: Vector3,
		blender_scale: Vector3, material: Material, breathing := false) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.name = _unique_human_name(name)
	var sphere := SphereMesh.new()
	sphere.radius = 1.0
	sphere.height = 2.0
	sphere.radial_segments = 32
	sphere.rings = 20
	instance.mesh = sphere
	instance.position = _blender_to_godot(blender_position)
	instance.scale = Vector3(blender_scale.x, blender_scale.z, blender_scale.y)
	instance.material_override = material
	parent.add_child(instance)
	if breathing:
		breathing_parts.append(instance)
		breathing_scales.append(instance.scale)
	return instance


func _add_human_cylinder(parent: Node3D, name: String, blender_start: Vector3,
		blender_end: Vector3, start_radius: float, end_radius: float,
		material: Material, radial_segments := 24) -> MeshInstance3D:
	var start := _blender_to_godot(blender_start)
	var finish := _blender_to_godot(blender_end)
	var direction := finish - start
	var instance := MeshInstance3D.new()
	instance.name = _unique_human_name(name)
	var cylinder := CylinderMesh.new()
	cylinder.bottom_radius = start_radius
	cylinder.top_radius = end_radius
	cylinder.height = direction.length()
	cylinder.radial_segments = radial_segments
	instance.mesh = cylinder
	instance.position = (start + finish) * 0.5
	instance.quaternion = Quaternion(Vector3.UP, direction.normalized())
	instance.material_override = material
	parent.add_child(instance)
	return instance


func _add_human_joint(parent: Node3D, name: String, blender_position: Vector3) -> Node3D:
	var joint := Node3D.new()
	joint.name = _unique_human_name(name)
	joint.position = _blender_to_godot(blender_position)
	parent.add_child(joint)
	return joint


func _build_human_avatar() -> void:
	avatar_visual = Node3D.new()
	avatar_visual.name = "ReferenceHuman"
	add_child(avatar_visual)

	var skin := _create_human_material("Natural Warm Skin", Color(0.48, 0.245, 0.16), 0.42)
	var lips := _create_human_material("Natural Lips", Color(0.38, 0.10, 0.09), 0.35)
	var eyes := _create_human_material("Deep Brown Iris", Color(0.045, 0.018, 0.009), 0.22)
	var white := _create_human_material("Eye White", Color(0.85, 0.81, 0.75), 0.2)
	var hair := _create_human_material("Dark Brown Hair", Color(0.025, 0.012, 0.009), 0.3)
	var cloth := _create_human_material("Charcoal Clothing", Color(0.025, 0.035, 0.05), 0.65)
	var shoes := _create_human_material("Shoes", Color(0.015, 0.015, 0.018), 0.3)

	_add_human_sphere(avatar_visual, "Head", Vector3(0, 0, 1.64), Vector3(0.115, 0.105, 0.145), skin)
	_add_human_sphere(avatar_visual, "Jaw", Vector3(0, -0.005, 1.555), Vector3(0.088, 0.09, 0.075), skin)
	_add_human_sphere(avatar_visual, "Chin", Vector3(0, -0.045, 1.535), Vector3(0.05, 0.055, 0.035), skin)
	_add_human_cylinder(avatar_visual, "Neck", Vector3(0, 0, 1.39), Vector3(0, 0, 1.55), 0.055, 0.045, skin)
	_add_human_sphere(avatar_visual, "Upper Torso", Vector3(0, 0, 1.31), Vector3(0.205, 0.105, 0.16), skin, true)
	_add_human_sphere(avatar_visual, "Chest", Vector3(0, -0.01, 1.22), Vector3(0.175, 0.10, 0.105), skin, true)
	for side in [-1, 1]:
		_add_human_sphere(avatar_visual, "Chest Volume",
			Vector3(side * 0.085, -0.085, 1.245), Vector3(0.083, 0.045, 0.075), skin, true)
	_add_human_sphere(avatar_visual, "Abdomen", Vector3(0, 0, 1.08), Vector3(0.145, 0.09, 0.15), skin)
	_add_human_sphere(avatar_visual, "Pelvis", Vector3(0, 0, 0.93), Vector3(0.18, 0.105, 0.105), skin)

	for side in [-1, 1]:
		_add_human_sphere(avatar_visual, "Shoulder",
			Vector3(side * 0.215, 0, 1.35), Vector3(0.075, 0.075, 0.075), skin)
		var shoulder := Vector3(side * 0.23, 0, 1.35)
		var upper_arm := _add_human_joint(avatar_visual, "UpperArmPivot", shoulder)
		arm_pivots.append(upper_arm)
		_add_human_cylinder(upper_arm, "Upper Arm", Vector3(0, 0, -0.01),
			Vector3(side * 0.06, 0, -0.22), 0.038, 0.048, skin)
		var elbow_position := Vector3(side * 0.06, 0, -0.22)
		_add_human_sphere(upper_arm, "Elbow", elbow_position,
			Vector3(0.039, 0.04, 0.04), skin)
		var forearm := _add_human_joint(upper_arm, "ForearmPivot", elbow_position)
		forearm_pivots.append(forearm)
		_add_human_cylinder(forearm, "Forearm", Vector3(0, 0, -0.01),
			Vector3(side * 0.03, -0.005, -0.22), 0.025, 0.038, skin)
		var hand_position := Vector3(side * 0.03, 0, -0.23)
		var hand := _add_human_joint(forearm, "HandPivot", hand_position)
		_add_human_sphere(hand, "Wrist", Vector3.ZERO, Vector3(0.027, 0.027, 0.027), skin)
		_add_human_sphere(hand, "Palm", Vector3(side * 0.005, -0.015, -0.045),
			Vector3(0.052, 0.028, 0.065), skin)
		for finger in range(4):
			var offset := (float(finger) - 1.5) * 0.022
			var start := Vector3(side * 0.005 + offset, -0.02, -0.08)
			var finish := Vector3(side * 0.005 + offset, -0.025, -0.135)
			_add_human_cylinder(hand, "Finger", start, finish, 0.009, 0.009, skin, 12)
			_add_human_sphere(hand, "Fingertip", finish, Vector3(0.009, 0.009, 0.012), skin)
		_add_human_cylinder(hand, "Thumb", Vector3(-side * 0.03, -0.025, -0.04),
			Vector3(-side * 0.055, -0.04, -0.08), 0.012, 0.012, skin, 12)

	for side in [-1, 1]:
		var hip := Vector3(side * 0.105, 0, 0.93)
		var thigh := _add_human_joint(avatar_visual, "ThighPivot", hip)
		thigh_pivots.append(thigh)
		_add_human_sphere(thigh, "Hip", Vector3(0, 0, -0.02),
			Vector3(0.09, 0.09, 0.105), skin)
		var knee_position := Vector3(side * 0.005, 0, -0.42)
		_add_human_cylinder(thigh, "Thigh", Vector3(0, 0, -0.01),
			Vector3(side * 0.005, 0, -0.40), 0.052, 0.075, skin)
		_add_human_sphere(thigh, "Knee", Vector3(side * 0.005, -0.005, -0.42),
			Vector3(0.052, 0.06, 0.055), skin)
		var shin := _add_human_joint(thigh, "ShinPivot", knee_position)
		shin_pivots.append(shin)
		_add_human_cylinder(shin, "Lower Leg", Vector3(0, 0.005, -0.01),
			Vector3(-side * 0.005, 0.005, -0.39), 0.029, 0.052, skin)
		var ankle_position := Vector3(-side * 0.005, 0.005, -0.405)
		var foot := _add_human_joint(shin, "FootPivot", ankle_position)
		foot_pivots.append(foot)
		_add_human_sphere(foot, "Ankle", Vector3.ZERO, Vector3(0.031, 0.034, 0.04), skin)
		_add_human_sphere(foot, "Foot", Vector3(0, -0.055, -0.05),
			Vector3(0.052, 0.12, 0.045), skin)
		for toe in range(5):
			var offset := (float(toe) - 2.0) * 0.017
			_add_human_sphere(foot, "Toe", Vector3(offset, -0.145, -0.055),
				Vector3(0.012, 0.035, 0.018), skin, false)

		_add_human_cylinder(thigh, "Trouser Leg", Vector3(0, 0, -0.01),
			Vector3(side * 0.005, 0, -0.40), 0.055, 0.078, cloth, 32)
		_add_human_sphere(foot, "Shoe", Vector3(0, -0.06, -0.065),
			Vector3(0.055, 0.12, 0.04), shoes)

	for side in [-1, 1]:
		var eye_x := side * 0.046
		_add_human_sphere(avatar_visual, "Eye Socket", Vector3(eye_x, -0.092, 1.674),
			Vector3(0.035, 0.021, 0.023), skin)
		_add_human_sphere(avatar_visual, "Eyeball", Vector3(eye_x, -0.108, 1.674),
			Vector3(0.026, 0.014, 0.016), white)
		_add_human_sphere(avatar_visual, "Iris", Vector3(eye_x, -0.121, 1.674),
			Vector3(0.011, 0.006, 0.012), eyes)
		_add_human_sphere(avatar_visual, "Eyebrow", Vector3(eye_x, -0.108, 1.706),
			Vector3(0.033, 0.009, 0.008), hair)
		_add_human_sphere(avatar_visual, "Ear", Vector3(side * 0.115, 0, 1.635),
			Vector3(0.022, 0.03, 0.045), skin)
		_add_human_sphere(avatar_visual, "Nostril", Vector3(side * 0.015, -0.151, 1.625),
			Vector3(0.008, 0.007, 0.006), hair)
	_add_human_sphere(avatar_visual, "Nose Bridge", Vector3(0, -0.105, 1.655),
		Vector3(0.021, 0.035, 0.052), skin)
	_add_human_sphere(avatar_visual, "Nose Tip", Vector3(0, -0.137, 1.632),
		Vector3(0.025, 0.025, 0.018), skin)
	_add_human_sphere(avatar_visual, "Upper Lip", Vector3(0, -0.105, 1.594),
		Vector3(0.034, 0.012, 0.009), lips)
	_add_human_sphere(avatar_visual, "Lower Lip", Vector3(0, -0.106, 1.581),
		Vector3(0.03, 0.012, 0.009), lips)
	_add_human_sphere(avatar_visual, "Hair Cap", Vector3(0, 0.005, 1.72),
		Vector3(0.12, 0.11, 0.075), hair)
	_add_human_sphere(avatar_visual, "Back Hair", Vector3(0, 0.065, 1.61),
		Vector3(0.115, 0.065, 0.14), hair)
	for side in [-1, 1]:
		_add_human_cylinder(avatar_visual, "Hair Lock",
			Vector3(side * 0.09, 0.015, 1.70), Vector3(side * 0.12, 0.025, 1.49),
			0.015, 0.025, hair, 16)

	_add_human_sphere(avatar_visual, "Clothing Top", Vector3(0, 0.002, 1.29),
		Vector3(0.19, 0.108, 0.105), cloth, true)
	_add_human_sphere(avatar_visual, "Waist Clothing", Vector3(0, 0, 0.96),
		Vector3(0.178, 0.108, 0.09), cloth)


func _update_human_animation(delta: float, moving: bool, running: bool) -> void:
	avatar_clock += delta
	gait_amount = move_toward(gait_amount, 1.0 if moving else 0.0, delta * 9.0)
	gait_phase += delta * (11.0 if running else 7.0)
	for index in range(arm_pivots.size()):
		var side_phase := gait_phase + (PI if index == 1 else 0.0)
		arm_pivots[index].rotation.x = sin(side_phase + PI) * gait_amount * (0.34 if running else 0.27)
		forearm_pivots[index].rotation.x = maxf(0.0, cos(side_phase + PI)) * gait_amount * (0.24 if running else 0.12)
	for index in range(thigh_pivots.size()):
		var side_phase := gait_phase + (PI if index == 1 else 0.0)
		thigh_pivots[index].rotation.x = sin(side_phase) * gait_amount * (0.40 if running else 0.29)
		shin_pivots[index].rotation.x = maxf(0.0, cos(side_phase)) * gait_amount * (0.48 if running else 0.24)
		foot_pivots[index].rotation.x = -maxf(0.0, cos(side_phase)) * gait_amount * 0.10
	var breath := sin(avatar_clock * 2.1) * 0.008
	for index in range(breathing_parts.size()):
		breathing_parts[index].scale = breathing_scales[index] * Vector3(1.0, 1.0 + breath, 1.0)


func _unhandled_input(event: InputEvent) -> void:
	if not world_active:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		yaw -= event.relative.x * 0.003
		pitch = clamp(pitch - event.relative.y * 0.003, -1.35, 1.20)
	elif event.is_action_pressed("ui_cancel"):
		if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event.is_action_pressed("camera_mode"):
		set_camera_mode("first" if camera_mode == "third" else "third")


func _physics_process(delta: float) -> void:
	camera_pivot.rotation = Vector3(pitch, yaw, 0.0)
	if not world_active:
		velocity = Vector3.ZERO
		return

	if not is_on_floor():
		velocity.y -= gravity * delta
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := Vector3.ZERO
	if input.length_squared() > 0.0:
		var flat_basis := Basis(Vector3.UP, yaw)
		direction = (flat_basis * Vector3(input.x, 0.0, input.y)).normalized()

	var wants_to_run := Input.is_action_pressed("run") and stamina > 1.0 and direction.length_squared() > 0.0
	if wants_to_run:
		stamina = maxf(stamina - 24.0 * delta, 0.0)
	else:
		stamina = minf(stamina + 16.0 * delta, 100.0)
	var speed := run_speed if wants_to_run else walk_speed
	var horizontal := direction * speed
	velocity.x = move_toward(velocity.x, horizontal.x, speed * 12.0 * delta)
	velocity.z = move_toward(velocity.z, horizontal.z, speed * 12.0 * delta)
	move_and_slide()

	if direction.length_squared() > 0.0 and camera_mode == "third":
		var target_yaw := atan2(-direction.x, -direction.z)
		rotation.y = lerp_angle(rotation.y, target_yaw, minf(delta * 10.0, 1.0))
	_update_human_animation(delta, direction.length_squared() > 0.0, wants_to_run)


func set_camera_mode(mode: String) -> void:
	camera_mode = mode
	if mode == "first":
		avatar_visual.visible = false
		camera.position = Vector3(0.0, 0.30, 0.05)
	else:
		avatar_visual.visible = true
		camera.position = Vector3(0.0, 1.25, 5.6)


func capture_state() -> Dictionary:
	return {
		"position": [global_position.x, global_position.y, global_position.z],
		"yaw": yaw,
		"pitch": pitch
	}


func restore_state(state: Dictionary) -> void:
	if state.has("position"):
		var p: Array = state["position"]
		if p.size() == 3:
			global_position = Vector3(float(p[0]), float(p[1]), float(p[2]))
	if state.has("yaw"):
		yaw = float(state["yaw"])
	if state.has("pitch"):
		pitch = float(state["pitch"])
	if state.has("camera_mode"):
		set_camera_mode(str(state["camera_mode"]))
