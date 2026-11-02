// Package httpx has tiny JSON helpers shared by every handler.
package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

var ErrNotImplemented = errors.New("not implemented yet")

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

// NotImplemented is what stubbed endpoints return until they're built.
func NotImplemented(w http.ResponseWriter) {
	Error(w, http.StatusNotImplemented, "not_implemented", ErrNotImplemented.Error())
}

// Decode reads a JSON body (max 1 MB) and rejects unknown fields.
func Decode(r *http.Request, dst any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20))
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
