extends CanvasLayer

var main


func setup(main_node) -> void:
	main = main_node
	build_ui()


func build_ui() -> void:
	var root := Control.new()
	root.name = "LandingRoot"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.025, 0.055, 0.085, 0.82)
	root.add_child(backdrop)

	var center := PanelContainer.new()
	center.name = "AccessPanel"
	center.anchor_left = 0.5
	center.anchor_top = 0.5
	center.anchor_right = 0.5
	center.anchor_bottom = 0.5
	center.position = Vector2(-230, -185)
	center.size = Vector2(460, 370)
	root.add_child(center)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	center.add_child(margin)

	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 16)
	margin.add_child(box)

	var title := Label.new()
	title.text = "OMNIVERSE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	box.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "ALPHA 0.0.1  |  CREATOR EXPLORATION"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 15)
	subtitle.add_theme_color_override("font_color", Color(0.62, 0.78, 0.88))
	box.add_child(subtitle)

	var description := Label.new()
	description.text = "Enter the connected test world as the creator.\nExplore the plaza, districts, coast and observation tower."
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(description)

	var enter_button := Button.new()
	enter_button.name = "EnterWorld"
	enter_button.text = "ENTER WORLD"
	enter_button.custom_minimum_size = Vector2(280, 54)
	enter_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	enter_button.pressed.connect(_enter_world)
	box.add_child(enter_button)

	var controls := Label.new()
	controls.text = "WASD  Move  •  SHIFT  Run  •  SPACE  Jump  •  V  Camera"
	controls.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	controls.add_theme_font_size_override("font_size", 13)
	box.add_child(controls)

	var quit_button := Button.new()
	quit_button.text = "QUIT"
	quit_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	quit_button.pressed.connect(func(): main.get_tree().quit())
	box.add_child(quit_button)


func _enter_world() -> void:
	main.enter_world()
