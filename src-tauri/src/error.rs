//! Shared error type for IPC command handlers.
//!
//! At the IPC boundary this is converted to a `String` via `Display`. The TS side
//! parses the leading `code:` prefix into a machine-readable code when present.

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "code", content = "message", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppError {
    #[error("io: {0}")]
    Io(String),

    #[error("parse: {0}")]
    Parse(String),

    #[error("not_found: {0}")]
    NotFound(String),

    #[error("internal: {0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
