extends Node

const SAVE_PATH := "user://omniverse_save.json"


func save_state(state: Dictionary) -> bool:
	var data := state.duplicate(true)
	data["version"] = "0.0.1"
	data["saved_at"] = Time.get_datetime_string_from_system(true)
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		push_error("Cannot open OMNIVERSE save file")
		return false
	file.store_string(JSON.stringify(data, "\t"))
	file.close()
	return true


func load_state() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		push_error("Cannot read OMNIVERSE save file")
		return {}
	var parsed := JSON.new()
	var error := parsed.parse(file.get_as_text())
	file.close()
	if error != OK:
		push_error("Invalid OMNIVERSE save file")
		return {}
	var data: Variant = parsed.data
	return data if data is Dictionary else {}
