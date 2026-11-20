extends Node3D

const WorldScript = preload("res://scripts/world.gd")
const PlayerScript = preload("res://scripts/player.gd")
const CreatorUIScript = preload("res://scripts/creator_ui.gd")
const SaveManagerScript = preload("res://scripts/save_manager.gd")
const LandingUIScript = preload("res://scripts/landing_ui.gd")

var player: CharacterBody3D
var world: Node3D
var creator_ui: CanvasLayer
var landing_ui: CanvasLayer
var save_manager: Node
var world_active := false


func _ready() -> void:
	save_manager = Node.new()
	save_manager.set_script(SaveManagerScript)
	add_child(save_manager)

	world = Node3D.new()
	world.name = "World"
	world.set_script(WorldScript)
	add_child(world)

	player = CharacterBody3D.new()
	player.name = "CreatorAvatar"
	player.set_script(PlayerScript)
	add_child(player)

	creator_ui = CanvasLayer.new()
	creator_ui.name = "CreatorUI"
	creator_ui.set_script(CreatorUIScript)
	add_child(creator_ui)
	creator_ui.setup(self)
	creator_ui.visible = false

	landing_ui = CanvasLayer.new()
	landing_ui.name = "LandingUI"
	landing_ui.set_script(LandingUIScript)
	add_child(landing_ui)
	landing_ui.setup(self)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	var saved: Dictionary = save_manager.load_state()
	if saved:
		creator_ui.show_message("Saved state loaded")
		player.restore_state(saved)


func _unhandled_input(event: InputEvent) -> void:
	if not world_active:
		return
	if event.is_action_pressed("creator_panel"):
		creator_ui.toggle_panel()
	elif event.is_action_pressed("inspect"):
		inspect_target()
	elif event.is_action_pressed("save_state"):
		save_state()
	elif event.is_action_pressed("load_state"):
		load_state()


func _process(_delta: float) -> void:
	if creator_ui and player:
		creator_ui.update_avatar_status(player.global_position, player.camera_mode)


func enter_world() -> void:
	world_active = true
	player.world_active = true
	landing_ui.visible = false
	creator_ui.visible = true
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	creator_ui.show_message("Welcome to OMNIVERSE")


func save_state() -> void:
	var state: Dictionary = player.capture_state()
	state["world"] = "Omniverse Alpha Test World"
	state["camera_mode"] = player.camera_mode
	if save_manager.save_state(state):
		creator_ui.show_message("State saved")
	else:
		creator_ui.show_message("Save failed")


func load_state() -> void:
	var state: Dictionary = save_manager.load_state()
	if state:
		player.restore_state(state)
		creator_ui.show_message("State loaded")
	else:
		creator_ui.show_message("No saved state")


func teleport_to(position: Vector3) -> void:
	player.global_position = position
	player.velocity = Vector3.ZERO
	creator_ui.show_message("Teleported")


func inspect_target() -> void:
	var camera := get_viewport().get_camera_3d()
	if camera == null:
		return
	var origin := camera.global_position
	var direction := -camera.global_transform.basis.z
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 100.0)
	var result := get_world_3d().direct_space_state.intersect_ray(query)
	if result:
		var collider: Object = result.get("collider")
		var point: Vector3 = result.get("position")
		creator_ui.show_inspection({
			"name": collider.name if collider else "<unknown>",
			"position": point
		})
	else:
		creator_ui.show_inspection({"name": "No target", "position": Vector3.ZERO})
