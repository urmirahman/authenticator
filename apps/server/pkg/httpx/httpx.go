// Package httpx has tiny JSON helpers shared by every handler.
package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

var (
	ErrNotImplemented = errors.New("not implemented yet")
	ErrNotFound       = errors.New("not found")
	ErrUnauthorized   = errors.New("unauthorized")
	ErrForbidden      = errors.New("forbidden")
	ErrConflict       = errors.New("conflict")
	ErrBadRequest     = errors.New("bad request")
)

type errorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func Error(w http.ResponseWriter, status int, code, message string) {
	var b errorBody
	b.Error.Code, b.Error.Message = code, message
	JSON(w, status, b)
}

// WriteError formats and writes an error response, checking against domain sentinels.
func WriteError(w http.ResponseWriter, err error, fallbackStatus int, fallbackCode, fallbackMessage string) {
	if err == nil {
		return
	}
	switch {
	case errors.Is(err, ErrNotFound):
		Error(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, ErrUnauthorized):
		Error(w, http.StatusUnauthorized, "unauthorized", err.Error())
	case errors.Is(err, ErrForbidden):
		Error(w, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, ErrConflict):
		Error(w, http.StatusConflict, "conflict", err.Error())
	case errors.Is(err, ErrBadRequest):
		Error(w, http.StatusBadRequest, "bad_request", err.Error())
	default:
		msg := fallbackMessage
		if msg == "" {
			msg = err.Error()
		}
		Error(w, fallbackStatus, fallbackCode, msg)
	}
}

// NotImplemented is what stubbed endpoints return until they're built.
func NotImplemented(w http.ResponseWriter) {
	Error(w, http.StatusNotImplemented, "not_implemented", ErrNotImplemented.Error())
}

// Decode reads a JSON body (max 1 MB) and rejects unknown fields.
func Decode(r *http.Request, dst any) error { return DecodeLimit(r, dst, 1<<20) }

// DecodeLimit is Decode with a custom size limit in bytes (e.g. backups).
func DecodeLimit(r *http.Request, dst any, limit int64) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, limit))
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
