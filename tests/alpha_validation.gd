extends SceneTree


func _initialize() -> void:
	var failures: Array[String] = []

	var required_files := [
		"res://project.godot",
		"res://scenes/Main.tscn",
		"res://scripts/main.gd",
		"res://scripts/player.gd",
		"res://scripts/world.gd",
		"res://scripts/creator_ui.gd",
		"res://scripts/save_manager.gd",
		"res://scripts/landing_ui.gd"
	]

	for path in required_files:
		if not FileAccess.file_exists(path):
			failures.append("missing " + path)

	var main_resource := load("res://scenes/Main.tscn")
	if main_resource == null:
		failures.append("Main.tscn could not be loaded")

	var player_script := load("res://scripts/player.gd")
	var world_script := load("res://scripts/world.gd")
	var save_script := load("res://scripts/save_manager.gd")
	if player_script == null:
		failures.append("player.gd could not be loaded")
	if world_script == null:
		failures.append("world.gd could not be loaded")
	if save_script == null:
		failures.append("save_manager.gd could not be loaded")

	if failures.is_empty():
		print("PASS: OMNIVERSE Alpha 0.0.1 project resources validated")
	else:
		push_error("FAIL: " + "\n".join(failures))
		quit(1)
		return
	quit(0)
