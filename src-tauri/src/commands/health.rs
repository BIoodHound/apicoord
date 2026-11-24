//! Starter IPC command. Proves the TS <-> Rust round-trip works.
//! Replace with real commands during Increment 1.

#[tauri::command]
pub fn ping() -> String {
    "ok".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_returns_ok() {
        assert_eq!(ping(), "ok");
    }
}
