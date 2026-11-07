package routing

import (
	"encoding/json"
	"testing"
)

func TestRoutingIDUnmarshalJSONPreservesUint64Number(t *testing.T) {
	t.Parallel()

	payload := []byte(`{"id":18446744073709551615}`)
	var body struct {
		ID RoutingID `json:"id"`
	}

	if err := json.Unmarshal(payload, &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if got := body.ID.String(); got != "18446744073709551615" {
		t.Fatalf("RoutingID.String() = %q, want %q", got, "18446744073709551615")
	}

	gotUint64, err := body.ID.Uint64()
	if err != nil {
		t.Fatalf("RoutingID.Uint64() error = %v", err)
	}

	if gotUint64 != ^uint64(0) {
		t.Fatalf("RoutingID.Uint64() = %d, want %d", gotUint64, ^uint64(0))
	}
}

func TestRoutingIDUnmarshalJSONAcceptsQuotedDecimalString(t *testing.T) {
	t.Parallel()

	payload := []byte(`{"id":"18446744073709551615"}`)
	var body struct {
		ID RoutingID `json:"id"`
	}

	if err := json.Unmarshal(payload, &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if got := body.ID.String(); got != "18446744073709551615" {
		t.Fatalf("RoutingID.String() = %q, want %q", got, "18446744073709551615")
	}
}

func TestRoutingIDUnmarshalJSONRejectsInvalidNumbers(t *testing.T) {
	t.Parallel()

	testCases := []string{
		`{"id":18446744073709551616}`,
		`{"id":-1}`,
		`{"id":1.5}`,
		`{"id":"not-a-number"}`,
	}

	for _, payload := range testCases {
		payload := payload
		t.Run(payload, func(t *testing.T) {
			t.Parallel()

			var body struct {
				ID RoutingID `json:"id"`
			}

			if err := json.Unmarshal([]byte(payload), &body); err == nil {
				t.Fatalf("json.Unmarshal(%s) error = nil, want non-nil", payload)
			}
		})
	}
}

func TestRoutingIDMarshalJSONEmitsDecimalString(t *testing.T) {
	t.Parallel()

	const id = "9007199254740993"
	encoded, err := json.Marshal(RoutingResult{
		DestinationBaseAccount: "GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI",
		RoutingID:              NewRoutingID(id),
		RoutingSource:          "memo",
	})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	var body struct {
		RoutingID json.RawMessage `json:"routingId"`
	}
	if err := json.Unmarshal(encoded, &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}

	if got, want := string(body.RoutingID), `"`+id+`"`; got != want {
		t.Fatalf("routingId = %s, want %s (full payload: %s)", got, want, encoded)
	}
}

func TestRoutingIDJSONRoundTripPreservesMaxUint64(t *testing.T) {
	t.Parallel()

	const id = "18446744073709551615"
	encoded, err := json.Marshal(struct {
		ID *RoutingID `json:"id"`
	}{ID: NewRoutingID(id)})
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	var decoded struct {
		ID *RoutingID `json:"id"`
	}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if decoded.ID == nil {
		t.Fatalf("round-trip produced nil RoutingID (payload: %s)", encoded)
	}
	if got := decoded.ID.String(); got != id {
		t.Fatalf("round-trip RoutingID = %q, want %q", got, id)
	}
}
