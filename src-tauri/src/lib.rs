use tauri::{
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    menu::{Menu, MenuItem},
    Manager, WindowEvent, State, AppHandle, Emitter, WebviewWindowBuilder,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use chrono::{DateTime, Local, NaiveTime, TimeZone};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TimeData {
    inicio1: String,
    fim1: String,
    inicio2: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorkStatus {
    remaining_minutes: i64,
    is_complete: bool,
    end_time: String,
}

type SharedState = Arc<Mutex<Option<WorkStatus>>>;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn start_work_monitoring(
    app: AppHandle,
    state: State<'_, SharedState>,
    inicio1: String,
    fim1: String,
    inicio2: String,
) -> Result<(), String> {
    println!("Starting work monitoring with times: {} {} {}", inicio1, fim1, inicio2);
    
    // Parse times
    let start1 = NaiveTime::parse_from_str(&inicio1, "%H:%M")
        .map_err(|e| format!("Error parsing inicio1: {}", e))?;
    let end1 = NaiveTime::parse_from_str(&fim1, "%H:%M")
        .map_err(|e| format!("Error parsing fim1: {}", e))?;
    let start2 = NaiveTime::parse_from_str(&inicio2, "%H:%M")
        .map_err(|e| format!("Error parsing inicio2: {}", e))?;

    // Calculate work periods
    let today = Local::now().date_naive();
    let start1_dt = Local.from_local_datetime(&today.and_time(start1)).unwrap();
    let end1_dt = Local.from_local_datetime(&today.and_time(end1)).unwrap();
    let start2_dt = Local.from_local_datetime(&today.and_time(start2)).unwrap();

    // Calculate first period worked minutes
    let period1_minutes = (end1_dt - start1_dt).num_minutes();
    let total_target_minutes = 8 * 60; // 8 hours
    let remaining_from_start2 = total_target_minutes - period1_minutes;
    
    // Calculate end time
    let expected_end = start2_dt + chrono::Duration::minutes(remaining_from_start2);

    let work_status = WorkStatus {
        remaining_minutes: remaining_from_start2,
        is_complete: false,
        end_time: expected_end.format("%H:%M").to_string(),
    };

    // Update shared state
    {
        let mut state_guard = state.lock().unwrap();
        *state_guard = Some(work_status);
    }

    // Start background monitoring
    let app_clone = app.clone();
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        monitor_work_completion(app_clone, state_clone, expected_end).await;
    });

    Ok(())
}

async fn monitor_work_completion(app: AppHandle, state: SharedState, end_time: DateTime<Local>) {
    loop {
        let now = Local::now();
        let remaining = (end_time - now).num_minutes();

        // Update state
        {
            let mut state_guard = state.lock().unwrap();
            if let Some(ref mut status) = *state_guard {
                status.remaining_minutes = remaining.max(0);
                status.is_complete = remaining <= 0;
            }
        }

        // Check if work is complete
        if remaining <= 0 {
            // Show system notification
            let _ = show_system_notification(
                app.clone(),
                "🎉 Jornada Completa!".to_string(),
                "Parabéns! Você completou suas 8 horas de trabalho. Tenha um ótimo resto do dia!".to_string()
            ).await;

            // Show overlay notification as well
            let _ = show_overlay_notification(
                app.clone(),
                "🎉 Jornada Completa!".to_string(),
                "Parabéns! Você completou suas 8 horas de trabalho. Tenha um ótimo resto do dia!".to_string()
            ).await;

            // Bring main window to foreground
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
                let _ = main_window.unminimize();
            }

            let _ = app.emit("work_complete", ());
            println!("Work complete! Notifying user...");
            break;
        }

        // Check if close to completion (3 minutes warning)
        if remaining <= 3 && remaining > 0 {
            // Show system notification for warning
            let _ = show_system_notification(
                app.clone(),
                "⏰ Quase Acabando!".to_string(),
                format!("Faltam apenas {} minutos para completar sua jornada!", remaining)
            ).await;

            // Show overlay notification for warning
            let _ = show_overlay_notification(
                app.clone(),
                "⏰ Quase Acabando!".to_string(),
                format!("Faltam apenas {} minutos para completar sua jornada!", remaining)
            ).await;

            // Bring main window to foreground
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
                let _ = main_window.unminimize();
            }

            let _ = app.emit("work_almost_complete", remaining);
            println!("Work almost complete: {} minutes remaining", remaining);
        }

        // Sleep for 1 minute before next check
        sleep(Duration::from_secs(60)).await;
    }
}

#[tauri::command]
fn get_work_status(state: State<'_, SharedState>) -> Option<WorkStatus> {
    let state_guard = state.lock().unwrap();
    state_guard.clone()
}

#[tauri::command]
async fn notify_work_complete() -> Result<(), String> {
    println!("Work completion notification triggered");
    Ok(())
}

#[tauri::command]
async fn start_monitoring() -> Result<(), String> {
    println!("Starting monitoring mode");
    Ok(())
}

#[tauri::command]
async fn show_system_notification(app: AppHandle, title: String, message: String) -> Result<(), String> {
    use tauri_plugin_notification::{NotificationExt, PermissionState};

    println!("Attempting to show system notification: {} - {}", title, message);

    // Check notification permission
    match app.notification().permission_state() {
        Ok(PermissionState::Granted) => {
            println!("Notification permission granted, showing notification");

            // Create and show the system notification
            match app.notification()
                .builder()
                .title(&title)
                .body(&message)
                .icon("icon")
                .show()
            {
                Ok(_) => {
                    println!("System notification sent successfully");
                    Ok(())
                }
                Err(e) => {
                    println!("Failed to show system notification: {}", e);
                    Err(format!("Failed to show system notification: {}", e))
                }
            }
        }
        Ok(PermissionState::Denied) => {
            println!("Notification permission denied");
            Err("Notification permission denied".to_string())
        }
        Ok(PermissionState::Prompt) | Ok(PermissionState::PromptWithRationale) => {
            println!("Notification permission not set, requesting permission");

            // Request permission first
            match app.notification().request_permission() {
                Ok(PermissionState::Granted) => {
                    println!("Permission granted after request, showing notification");

                    // Now show the notification
                    match app.notification()
                        .builder()
                        .title(&title)
                        .body(&message)
                        .icon("icon")
                        .show()
                    {
                        Ok(_) => {
                            println!("System notification sent successfully after permission request");
                            Ok(())
                        }
                        Err(e) => {
                            println!("Failed to show system notification after permission request: {}", e);
                            Err(format!("Failed to show system notification: {}", e))
                        }
                    }
                }
                Ok(_) => {
                    println!("Permission denied after request");
                    Err("Notification permission denied after request".to_string())
                }
                Err(e) => {
                    println!("Error requesting notification permission: {}", e);
                    Err(format!("Error requesting notification permission: {}", e))
                }
            }
        }
        Err(e) => {
            println!("Error checking notification permission: {}", e);
            Err(format!("Error checking notification permission: {}", e))
        }
    }
}

#[tauri::command]
async fn show_overlay_notification(app: AppHandle, title: String, message: String) -> Result<(), String> {
    println!("Showing overlay notification: {} - {}", title, message);

    // Check if overlay window already exists and close it
    if let Some(existing_window) = app.get_webview_window("notification_overlay") {
        let _ = existing_window.close();
        // Wait a moment to ensure the window is closed
        sleep(Duration::from_millis(100)).await;
    }

    // Get primary monitor to calculate positioning
    let primary_monitor = app.primary_monitor()
        .map_err(|e| format!("Failed to get primary monitor: {}", e))?
        .ok_or("No primary monitor found")?;

    let monitor_size = primary_monitor.size();
    let notification_width = 500.0;
    let notification_height = 200.0;

    // Calculate center position
    let x_position = (monitor_size.width as f64 / 2.0) - (notification_width / 2.0);
    let y_position = (monitor_size.height as f64 / 2.0) - (notification_height / 2.0); // Center vertically

    // Create overlay notification window with inline HTML
    let notification_html = format!(r#"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expediente Concluído</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            position: relative;
        }}

        .notification-container {{
            text-align: center;
            padding: 32px 24px;
            max-width: 480px;
            width: 100%;
            animation: slideInScale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }}

        .success-icon {{
            font-size: 48px;
            margin-bottom: 16px;
            animation: bounce 0.6s ease-out 0.2s both;
        }}

        .notification-title {{
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 12px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            letter-spacing: -0.5px;
        }}

        .notification-message {{
            font-size: 16px;
            opacity: 0.95;
            line-height: 1.5;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            margin-bottom: 20px;
        }}

        .close-button {{
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            padding: 10px 20px;
            border-radius: 25px;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        }}

        .close-button:hover {{
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }}

        .close-button:active {{
            transform: translateY(0);
        }}

        .progress-bar {{
            position: absolute;
            bottom: 0;
            left: 0;
            height: 4px;
            background: rgba(255, 255, 255, 0.8);
            width: 100%;
            border-radius: 0 0 16px 16px;
            animation: progressBar 8s linear;
        }}

        @keyframes slideInScale {{
            from {{
                opacity: 0;
                transform: translateY(-30px) scale(0.9);
            }}
            to {{
                opacity: 1;
                transform: translateY(0) scale(1);
            }}
        }}

        @keyframes bounce {{
            from {{
                opacity: 0;
                transform: scale(0.3);
            }}
            50% {{
                opacity: 1;
                transform: scale(1.1);
            }}
            to {{
                opacity: 1;
                transform: scale(1);
            }}
        }}

        @keyframes progressBar {{
            from {{
                width: 100%;
            }}
            to {{
                width: 0%;
            }}
        }}
    </style>
</head>
<body>
    <div class="notification-container">
        <div class="success-icon" id="icon">{}</div>
        <div class="notification-title" id="title">{}</div>
        <div class="notification-message" id="message">{}</div>
        <button class="close-button" onclick="closeNotification()">Fechar</button>
    </div>
    <div class="progress-bar"></div>

    <script>
        const {{ invoke }} = window.__TAURI__.core;

        // Close notification function
        async function closeNotification() {{
            try {{
                await invoke('close_overlay_notification');
            }} catch (error) {{
                console.error('Error closing notification:', error);
            }}
        }}

        // Play notification sound
        function playNotificationSound() {{
            try {{
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Create success chime sound
                const oscillator1 = audioContext.createOscillator();
                const oscillator2 = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator1.connect(gainNode);
                oscillator2.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Success chime frequencies
                oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator1.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
                oscillator1.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

                oscillator2.frequency.setValueAtTime(523.25 * 2, audioContext.currentTime + 0.1); // C6
                oscillator2.frequency.setValueAtTime(659.25 * 2, audioContext.currentTime + 0.2); // E6

                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator1.start(audioContext.currentTime);
                oscillator1.stop(audioContext.currentTime + 0.5);

                oscillator2.start(audioContext.currentTime + 0.1);
                oscillator2.stop(audioContext.currentTime + 0.4);
            }} catch (error) {{
                console.log('Could not play notification sound:', error);
            }}
        }}

        // Play sound when notification appears
        window.addEventListener('DOMContentLoaded', () => {{
            setTimeout(() => {{
                playNotificationSound();
            }}, 200);
        }});

        // Auto-close after 8 seconds
        setTimeout(() => {{
            closeNotification();
        }}, 8000);
    </script>
</body>
</html>
"#,
        // Extract icon from title or use default
        if title.contains("🎉") { "🎉" }
        else if title.contains("⏰") { "⏰" }
        else if title.contains("🧪") { "🧪" }
        else { "✅" },
        title,
        message
    );

    let overlay_window = WebviewWindowBuilder::new(
        &app,
        "notification_overlay",
        tauri::WebviewUrl::App(format!("data:text/html;charset=utf-8,{}", urlencoding::encode(&notification_html)).parse().unwrap())
    )
    .title("Notificação")
    .inner_size(notification_width, notification_height)
    .position(x_position, y_position)
    .resizable(false)
    .minimizable(false)
    .maximizable(false)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    .build()
    .map_err(|e| format!("Failed to create overlay window: {}", e))?;

    // No need to send notification data as it's embedded in HTML

    // Auto-close after 8 seconds (same as frontend)
    let overlay_window_clone = overlay_window.clone();
    tokio::spawn(async move {
        sleep(Duration::from_secs(8)).await;
        let _ = overlay_window_clone.close();
    });

    Ok(())
}

#[tauri::command]
async fn close_overlay_notification(app: AppHandle) -> Result<(), String> {
    if let Some(overlay_window) = app.get_webview_window("notification_overlay") {
        let _ = overlay_window.close();
    }
    Ok(())
}


fn create_system_tray(app: &AppHandle) -> tauri::Result<()> {
    let quit_i = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "Mostrar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let _ = TrayIconBuilder::with_id("main")
        .tooltip("NoPonto - Controle de Ponto")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                println!("Quit menu item was clicked");
                std::process::exit(0);
            }
            "show" => {
                println!("Show menu item was clicked");
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {
                println!("Unknown menu item clicked: {:?}", event.id);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_state: SharedState = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .manage(shared_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            start_work_monitoring,
            get_work_status,
            notify_work_complete,
            start_monitoring,
            show_system_notification,
            show_overlay_notification,
            close_overlay_notification
        ])
        .setup(|app| {
            // Create system tray
            create_system_tray(app.handle())?;
            
            // Prevent the app from closing when the window is closed
            let main_window = app.get_webview_window("main").unwrap();
            
            let app_handle = app.handle().clone();
            main_window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    
                    // Hide the window instead of closing the app
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}