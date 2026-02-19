use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Get the saves directory: ~/.sharpee/saves/{storyId}/
fn saves_dir(story_id: &str) -> PathBuf {
    let base = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("sharpee")
        .join("saves")
        .join(story_id);
    fs::create_dir_all(&base).ok();
    base
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveSlotInfo {
    pub name: String,
    pub timestamp: u64,
    pub turn_count: u32,
    pub location: String,
    pub story_id: String,
}

/// Open a native file picker for .sharpee files, return the file bytes and path
#[tauri::command]
async fn open_bundle(app: tauri::AppHandle) -> Result<(Vec<u8>, String), String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .add_filter("Sharpee Story", &["sharpee"])
        .blocking_pick_file()
        .ok_or_else(|| "No file selected".to_string())?;

    let path = file_path.as_path()
        .ok_or_else(|| "Invalid file path".to_string())?;

    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    let path_str = path.to_string_lossy().to_string();
    Ok((bytes, path_str))
}

/// Read a bundle from a known file path (for re-opening recent stories)
#[tauri::command]
async fn read_bundle_path(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// List all save slots for a story
#[tauri::command]
async fn list_saves(story_id: String) -> Result<Vec<SaveSlotInfo>, String> {
    let dir = saves_dir(&story_id);
    let mut slots = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(data) = fs::read_to_string(&path) {
                    // Read the metadata wrapper
                    if let Ok(meta) = serde_json::from_str::<SaveFileWrapper>(&data) {
                        slots.push(SaveSlotInfo {
                            name: meta.slot_name,
                            timestamp: meta.timestamp,
                            turn_count: meta.turn_count,
                            location: meta.location,
                            story_id: story_id.clone(),
                        });
                    }
                }
            }
        }
    }

    slots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(slots)
}

#[derive(Debug, Serialize, Deserialize)]
struct SaveFileWrapper {
    slot_name: String,
    timestamp: u64,
    turn_count: u32,
    location: String,
    data: serde_json::Value,
}

/// Save game state to a named slot
#[tauri::command]
async fn save_game(
    story_id: String,
    slot_name: String,
    data: serde_json::Value,
    timestamp: u64,
    turn_count: u32,
    location: String,
) -> Result<(), String> {
    let dir = saves_dir(&story_id);
    let file_path = dir.join(format!("{}.json", sanitize_filename(&slot_name)));

    let wrapper = SaveFileWrapper {
        slot_name,
        timestamp,
        turn_count,
        location,
        data,
    };

    let json = serde_json::to_string_pretty(&wrapper)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&file_path, json).map_err(|e| format!("Failed to write save: {}", e))
}

/// Restore game state from a named slot
#[tauri::command]
async fn restore_game(
    story_id: String,
    slot_name: String,
) -> Result<serde_json::Value, String> {
    let dir = saves_dir(&story_id);
    let file_path = dir.join(format!("{}.json", sanitize_filename(&slot_name)));

    let data = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read save: {}", e))?;

    let wrapper: SaveFileWrapper = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse save: {}", e))?;

    Ok(wrapper.data)
}

/// Delete a save slot
#[tauri::command]
async fn delete_save(story_id: String, slot_name: String) -> Result<(), String> {
    let dir = saves_dir(&story_id);
    let file_path = dir.join(format!("{}.json", sanitize_filename(&slot_name)));
    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete save: {}", e))
}

/// Auto-save (special slot)
#[tauri::command]
async fn auto_save(story_id: String, data: serde_json::Value) -> Result<(), String> {
    let dir = saves_dir(&story_id);
    let file_path = dir.join("__autosave__.json");

    let json = serde_json::to_string(&data)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&file_path, json).map_err(|e| format!("Failed to write autosave: {}", e))
}

/// Load auto-save
#[tauri::command]
async fn load_auto_save(story_id: String) -> Result<Option<serde_json::Value>, String> {
    let dir = saves_dir(&story_id);
    let file_path = dir.join("__autosave__.json");

    if !file_path.exists() {
        return Ok(None);
    }

    let data = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read autosave: {}", e))?;

    let value: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse autosave: {}", e))?;

    Ok(Some(value))
}

/// Check if auto-save exists
#[tauri::command]
async fn has_auto_save(story_id: String) -> Result<bool, String> {
    let dir = saves_dir(&story_id);
    Ok(dir.join("__autosave__.json").exists())
}

/// Sanitize a filename to prevent path traversal
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_bundle,
            read_bundle_path,
            list_saves,
            save_game,
            restore_game,
            delete_save,
            auto_save,
            load_auto_save,
            has_auto_save,
        ])
        .setup(|app| {
            // Always open devtools (enabled via "devtools" feature in Cargo.toml)
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
