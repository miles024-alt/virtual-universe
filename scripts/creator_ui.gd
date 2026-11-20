extends CanvasLayer

var main
var panel: PanelContainer
var status_label: Label
var inspection_label: Label
var message_label: Label
var message_time := 0.0
var stamina_label: Label
var location_label: Label
var minimap: PanelContainer
var minimap_canvas: Control
var objective_label: Label
var visited_zones: Array[String] = []


func setup(main_node) -> void:
	main = main_node
	build_ui()


func build_ui() -> void:
	var controls := Control.new()
	add_child(controls)

	status_label = Label.new()
	status_label.name = "Status"
	status_label.position = Vector2(16, 14)
	status_label.text = "OMNIVERSE  |  ALPHA 0.0.1  |  CREATOR"
	status_label.add_theme_font_size_override("font_size", 20)
	status_label.add_theme_color_override("font_outline_color", Color(0.05, 0.07, 0.10))
	status_label.add_theme_constant_override("outline_size", 6)
	controls.add_child(status_label)

	location_label = Label.new()
	location_label.name = "Location"
	location_label.position = Vector2(16, 44)
	location_label.text = "CENTRAL PLAZA"
	location_label.add_theme_font_size_override("font_size", 14)
	location_label.add_theme_color_override("font_color", Color(0.78, 0.88, 0.92))
	controls.add_child(location_label)

	var hint := Label.new()
	hint.name = "ControlsHint"
	hint.text = "WASD move  |  Shift run  |  Space jump  |  V camera  |  F1 creator panel  |  F2 inspect  |  F5 save  |  F6 load"
	hint.position = Vector2(16, 64)
	hint.add_theme_font_size_override("font_size", 16)
	controls.add_child(hint)

	inspection_label = Label.new()
	inspection_label.name = "Inspection"
	inspection_label.position = Vector2(16, 680)
	inspection_label.text = ""
	controls.add_child(inspection_label)

	message_label = Label.new()
	message_label.name = "Message"
	message_label.anchor_left = 0.5
	message_label.anchor_right = 0.5
	message_label.position = Vector2(-240, 650)
	message_label.size = Vector2(480, 30)
	message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message_label.text = ""
	message_label.add_theme_font_size_override("font_size", 18)
	controls.add_child(message_label)

	panel = PanelContainer.new()
	panel.name = "CreatorPanel"
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.position = Vector2(-340, 48)
	panel.size = Vector2(320, 520)
	panel.visible = false
	controls.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	panel.add_child(margin)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 8)
	margin.add_child(box)

	var title := Label.new()
	title.text = "CREATOR CONTROL"
	title.add_theme_font_size_override("font_size", 22)
	box.add_child(title)

	add_label(box, "World: Alpha Test World")
	add_label(box, "Inhabitants: 1 creator")
	add_label(box, "Status: Running")
	add_button(box, "Teleport: Plaza", func(): main.teleport_to(Vector3(0, 1.2, 0)))
	add_button(box, "Teleport: Residential", func(): main.teleport_to(Vector3(-28, 1.2, -18)))
	add_button(box, "Teleport: Commercial", func(): main.teleport_to(Vector3(28, 1.2, -18)))
	add_button(box, "Teleport: Tower", func(): main.teleport_to(Vector3(38, 15.2, 30)))
	add_button(box, "Teleport: Coast", func(): main.teleport_to(Vector3(-38, 1.2, 42)))
	add_button(box, "Save State (F5)", main.save_state)
	add_button(box, "Load State (F6)", main.load_state)
	add_button(box, "Inspect Target (F2)", main.inspect_target)

	build_explorer_hud(controls)
	build_minimap(controls)


func build_explorer_hud(controls: Control) -> void:
	var objective_panel := PanelContainer.new()
	objective_panel.name = "ExplorerObjectives"
	objective_panel.position = Vector2(16, 96)
	objective_panel.size = Vector2(270, 118)
	controls.add_child(objective_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_bottom", 10)
	objective_panel.add_child(margin)

	var box := VBoxContainer.new()
	margin.add_child(box)
	var title := Label.new()
	title.text = "EXPLORATION"
	title.add_theme_font_size_override("font_size", 16)
	box.add_child(title)
	objective_label = Label.new()
	objective_label.text = "0 / 5 landmarks discovered"
	box.add_child(objective_label)
	stamina_label = Label.new()
	stamina_label.text = "STAMINA  100%"
	box.add_child(stamina_label)


func build_minimap(controls: Control) -> void:
	minimap = PanelContainer.new()
	minimap.name = "Minimap"
	minimap.anchor_left = 1.0
	minimap.anchor_right = 1.0
	minimap.position = Vector2(-180, 72)
	minimap.size = Vector2(164, 164)
	controls.add_child(minimap)
	minimap_canvas = Control.new()
	minimap_canvas.size = Vector2(164, 164)
	minimap_canvas.draw.connect(_draw_minimap)
	minimap.add_child(minimap_canvas)


func add_label(parent: Node, text: String) -> void:
	var label := Label.new()
	label.text = text
	parent.add_child(label)


func add_button(parent: Node, text: String, callback: Callable) -> void:
	var button := Button.new()
	button.text = text
	button.pressed.connect(callback)
	parent.add_child(button)


func toggle_panel() -> void:
	panel.visible = not panel.visible


func show_message(text: String) -> void:
	message_label.text = text
	message_time = 3.0


func show_inspection(data: Dictionary) -> void:
	var point: Vector3 = data["position"]
	inspection_label.text = "Target: %s  |  World position: (%.1f, %.1f, %.1f)" % [
		data["name"], point.x, point.y, point.z
	]


func update_avatar_status(position: Vector3, camera: String) -> void:
	var zone := "WILDERNESS"
	if position.x < -15.0 and position.z < -10.0:
		zone = "RESIDENTIAL DISTRICT"
	elif position.x > 15.0 and position.z < -10.0:
		zone = "COMMERCIAL DISTRICT"
	elif position.z > 42.0:
		zone = "COAST"
	elif position.x > 30.0 and position.z > 20.0:
		zone = "OBSERVATION RIDGE"
	elif position.length() < 14.0:
		zone = "CENTRAL PLAZA"
	location_label.text = zone + "  |  " + camera.to_upper() + " CAMERA"

	if not zone in visited_zones:
		visited_zones.append(zone)
		if visited_zones.size() > 1:
			show_message(zone + " discovered")
	objective_label.text = str(mini(visited_zones.size(), 5)) + " / 5 landmarks discovered"
	if is_instance_valid(main.player):
		stamina_label.text = "STAMINA  %d%%" % roundi(main.player.stamina)
	minimap_canvas.queue_redraw()


func _draw_minimap() -> void:
	var size := minimap_canvas.size
	var center := size * 0.5
	minimap_canvas.draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.08, 0.11, 0.88))
	minimap_canvas.draw_line(Vector2(center.x, 8), Vector2(center.x, size.y - 8), Color(0.24, 0.30, 0.34), 2.0)
	minimap_canvas.draw_line(Vector2(8, center.y), Vector2(size.x - 8, center.y), Color(0.24, 0.30, 0.34), 2.0)
	for landmark in [Vector2(82, 82), Vector2(48, 62), Vector2(116, 62), Vector2(154, 126), Vector2(122, 116)]:
		minimap_canvas.draw_circle(landmark, 3.5, Color(0.68, 0.84, 0.91))
	if is_instance_valid(main.player):
		var pos: Vector3 = main.player.global_position
		var map_pos := Vector2(
			clamp(center.x + pos.x * 0.75, 8.0, size.x - 8.0),
			clamp(center.y + pos.z * 0.75, 8.0, size.y - 8.0)
		)
		minimap_canvas.draw_circle(map_pos, 5.0, Color(0.96, 0.72, 0.22))


func _process(delta: float) -> void:
	if message_time > 0.0:
		message_time -= delta
		if message_time <= 0.0:
			message_label.text = ""
