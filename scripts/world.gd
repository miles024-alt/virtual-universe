extends Node3D

var materials: Dictionary = {}
var world_environment: WorldEnvironment
var sun: DirectionalLight3D
var day_time := 0.32
var is_day_paused := false


func _ready() -> void:
	_setup_environment()
	create_ground()
	create_plaza()
	create_roads()
	create_residential_district()
	create_commercial_district()
	create_natural_landscape()
	create_coast()
	create_observation_tower()
	create_signage()


func _setup_environment() -> void:
	materials["grass"] = standard_material(Color(0.28, 0.48, 0.22))
	materials["earth"] = standard_material(Color(0.42, 0.34, 0.22))
	materials["road"] = standard_material(Color(0.16, 0.17, 0.19))
	materials["walkway"] = standard_material(Color(0.62, 0.60, 0.54))
	materials["water"] = standard_material(Color(0.10, 0.43, 0.68), 0.78)
	materials["stone"] = standard_material(Color(0.52, 0.50, 0.46))
	materials["wood"] = standard_material(Color(0.36, 0.22, 0.12))
	materials["glass"] = standard_material(Color(0.32, 0.66, 0.82), 0.28)
	materials["white"] = standard_material(Color(0.88, 0.88, 0.82))
	materials["orange"] = standard_material(Color(0.82, 0.38, 0.16))
	materials["green"] = standard_material(Color(0.18, 0.52, 0.22))
	materials["roof"] = standard_material(Color(0.25, 0.28, 0.34))

	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-50, -35, 0)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	add_child(sun)

	world_environment = WorldEnvironment.new()
	var settings := Environment.new()
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.12, 0.38, 0.72)
	sky_material.sky_horizon_color = Color(0.58, 0.74, 0.86)
	sky_material.ground_bottom_color = Color(0.12, 0.16, 0.20)
	sky_material.ground_horizon_color = Color(0.38, 0.48, 0.52)
	sky_material.sun_angle_max = 32.0
	sky.sky_material = sky_material
	settings.sky = sky
	settings.background_mode = Environment.BG_SKY
	settings.ambient_light_source = Environment.AMBIENT_SOURCE_BG
	settings.ambient_light_color = Color(0.72, 0.78, 0.85)
	settings.ambient_light_energy = 0.7
	settings.fog_enabled = true
	settings.fog_light_color = Color(0.62, 0.76, 0.82)
	settings.fog_density = 0.0015
	world_environment.environment = settings
	add_child(world_environment)

	create_distant_clouds()


func _process(delta: float) -> void:
	if is_day_paused:
		return
	day_time = fmod(day_time + delta * 0.0025, 1.0)
	sun.rotation_degrees.x = day_time * 360.0 - 90.0
	sun.light_energy = 0.35 + clamp(sin(day_time * TAU - PI * 0.5) * 0.85 + 0.65, 0.0, 1.0)
	var night_factor: float = clamp(sin(day_time * TAU - PI * 0.5), -0.2, 1.0)
	world_environment.environment.ambient_light_energy = 0.25 + 0.45 * maxf(night_factor, 0.0)


func toggle_day_cycle() -> void:
	is_day_paused = not is_day_paused


func create_distant_clouds() -> void:
	for i in range(12):
		var cloud := MeshInstance3D.new()
		cloud.name = "Cloud_%d" % i
		var mesh := SphereMesh.new()
		mesh.radius = 3.0 + float(i % 3)
		mesh.height = 1.6
		cloud.mesh = mesh
		cloud.position = Vector3(-72 + i * 13, 28 + float(i % 4) * 2.0, -45 + float(i % 5) * 18)
		var material := StandardMaterial3D.new()
		material.albedo_color = Color(0.92, 0.94, 0.96, 0.58)
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		cloud.material_override = material
		add_child(cloud)


func standard_material(color: Color, alpha := 1.0) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(color.r, color.g, color.b, alpha)
	if alpha < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material


func create_ground() -> void:
	create_box("Ground", Vector3(160, 1.0, 160), Vector3(0, -0.5, 0), materials["grass"])


func create_box(box_name: String, size: Vector3, position: Vector3, material: Material) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = box_name
	body.position = position

	var mesh_instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	body.add_child(mesh_instance)

	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	add_child(body)
	return body


func create_plaza() -> void:
	create_box("CentralPlaza", Vector3(18, 0.12, 18), Vector3(0, 0.06, 0), materials["walkway"])
	create_box("PlazaFountainBase", Vector3(5.0, 0.5, 5.0), Vector3(0, 0.32, 0), materials["stone"])
	create_cylinder("PlazaFountain", 2.0, 0.25, Vector3(0, 0.75, 0), materials["water"])


func create_cylinder(cylinder_name: String, radius: float, height: float, position: Vector3, material: Material) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.name = cylinder_name
	body.position = position
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	mesh_instance.mesh = mesh
	mesh_instance.material_override = material
	body.add_child(mesh_instance)
	var collision := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	collision.shape = shape
	body.add_child(collision)
	add_child(body)
	return body


func create_roads() -> void:
	create_box("NorthSouthRoad", Vector3(8, 0.08, 100), Vector3(0, 0.04, 0), materials["road"])
	create_box("EastWestRoad", Vector3(100, 0.08, 8), Vector3(0, 0.04, 0), materials["road"])
	for z in range(-45, 46, 10):
		create_box("NSRoadMark", Vector3(0.12, 0.03, 3.5), Vector3(0, 0.10, z), materials["white"])
	for x in range(-45, 46, 10):
		create_box("EWRoadMark", Vector3(3.5, 0.03, 0.12), Vector3(x, 0.10, 0), materials["white"])


func create_residential_district() -> void:
	var homes := [
		Vector3(-24, 0, -20), Vector3(-38, 0, -20), Vector3(-24, 0, -34), Vector3(-38, 0, -34)
	]
	for i in homes.size():
		create_house("Residence_%d" % i, homes[i], 7.0, 5.0, 8.0, materials["white"], i % 2 == 0)


func create_commercial_district() -> void:
	create_building("MarketHall", Vector3(24, 0, -20), Vector3(12, 7, 10), materials["orange"])
	create_building("OfficeTower", Vector3(40, 0, -24), Vector3(10, 16, 10), materials["glass"])
	create_building("Workshop", Vector3(25, 0, -38), Vector3(14, 5, 9), materials["stone"])


func create_building(building_name: String, position: Vector3, size: Vector3, material: Material) -> void:
	create_box(building_name, size, position + Vector3(0, size.y * 0.5, 0), material)
	create_box(building_name + "_Roof", Vector3(size.x + 0.6, 0.5, size.z + 0.6),
		position + Vector3(0, size.y + 0.25, 0), materials["roof"])


func create_house(house_name: String, position: Vector3, width: float, depth: float, height: float,
		wall_material: Material, alternate: bool) -> void:
	create_box(house_name, Vector3(width, height, depth), position + Vector3(0, height * 0.5, 0), wall_material)
	var roof := create_box(house_name + "_Roof", Vector3(width + 1.0, 0.6, depth + 1.0),
		position + Vector3(0, height + 0.3, 0), materials["roof"])
	roof.rotation_degrees.z = 3.0 if alternate else -3.0


func create_natural_landscape() -> void:
	for i in range(18):
		var angle := TAU * i / 18.0
		var radius := 50.0 + (i % 3) * 4.0
		create_tree(Vector3(cos(angle) * radius, 0, sin(angle) * radius), 0.8 + (i % 4) * 0.12)

	create_mountain("WestMountain", Vector3(-55, 0, -52), 18.0, 24.0)
	create_mountain("NorthMountain", Vector3(8, 0, -58), 15.0, 20.0)
	create_mountain("EastMountain", Vector3(55, 0, -45), 20.0, 28.0)


func create_tree(position: Vector3, scale: float) -> void:
	create_cylinder("TreeTrunk", 0.24 * scale, 3.2 * scale,
		position + Vector3(0, 1.6 * scale, 0), materials["wood"])
	var crown := MeshInstance3D.new()
	crown.name = "TreeCrown"
	crown.position = position + Vector3(0, 4.1 * scale, 0)
	var mesh := SphereMesh.new()
	mesh.radius = 1.8 * scale
	mesh.height = 3.6 * scale
	crown.mesh = mesh
	crown.material_override = materials["green"]
	add_child(crown)


func create_mountain(mountain_name: String, position: Vector3, radius: float, height: float) -> void:
	var body := StaticBody3D.new()
	body.name = mountain_name
	body.position = position
	var mesh_instance := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = 1.0
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 12
	mesh_instance.mesh = mesh
	mesh_instance.material_override = materials["earth"]
	body.add_child(mesh_instance)
	var collision := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	collision.shape = shape
	body.add_child(collision)
	add_child(body)


func create_coast() -> void:
	create_box("CoastWater", Vector3(130, 0.20, 34), Vector3(-18, -0.05, 68), materials["water"])
	create_box("Beach", Vector3(130, 0.12, 8), Vector3(-18, 0.06, 48), standard_material(Color(0.72, 0.64, 0.46)))


func create_observation_tower() -> void:
	var base := Vector3(38, 0, 30)
	for offset in [Vector2(-2.2, -2.2), Vector2(2.2, -2.2), Vector2(-2.2, 2.2), Vector2(2.2, 2.2)]:
		create_box("TowerLeg", Vector3(0.45, 14, 0.45),
			base + Vector3(offset.x, 7, offset.y), materials["white"])
	create_box("ObservationDeck", Vector3(7, 0.5, 7), base + Vector3(0, 14, 0), materials["stone"])
	create_box("ObservationRoom", Vector3(5.5, 3.5, 5.5), base + Vector3(0, 16.2, 0), materials["glass"])
	create_box("TowerRoof", Vector3(6.5, 0.5, 6.5), base + Vector3(0, 18.2, 0), materials["roof"])
	create_box("ObservationPlatform", Vector3(1.2, 0.8, 1.2), base + Vector3(0, 19.2, 0), materials["stone"])


func create_signage() -> void:
	create_sign("CENTRAL PLAZA", Vector3(0, 3.2, 9), Vector3.ZERO)
	create_sign("RESIDENTIAL DISTRICT", Vector3(-28, 3.2, -10), Vector3(0, 180, 0))
	create_sign("COMMERCIAL DISTRICT", Vector3(28, 3.2, -10), Vector3(0, 180, 0))


func create_sign(sign_name: String, position: Vector3, rotation: Vector3) -> void:
	var sign := create_box(sign_name, Vector3(7, 1.2, 0.25), position, materials["wood"])
	sign.rotation_degrees = rotation
