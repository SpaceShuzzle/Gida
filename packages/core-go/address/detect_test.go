package address

import (
	"errors"
	"testing"
)

func TestDetectRejectsWrongPayloadLength(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name    string
		version byte
		size    int
	}{
		{name: "G payload too short", version: VersionByteG, size: 31},
		{name: "G payload too long", version: VersionByteG, size: 33},
		{name: "C payload too short", version: VersionByteC, size: 31},
		{name: "C payload too long", version: VersionByteC, size: 33},
		{name: "M payload too short", version: VersionByteM, size: 39},
		{name: "M payload too long", version: VersionByteM, size: 41},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			addr, err := EncodeStrKey(tc.version, make([]byte, tc.size))
			if err != nil {
				t.Fatalf("EncodeStrKey() error = %v", err)
			}

			kind, err := Detect(addr)
			if kind != "" {
				t.Fatalf("Detect() kind = %q, want empty", kind)
			}
			if !errors.Is(err, ErrInvalidLengthError) {
				t.Fatalf("Detect() error = %v, want ErrInvalidLengthError", err)
			}
			if Validate(addr) {
				t.Fatalf("Validate() = true for a strkey with a %d-byte payload", tc.size)
			}
		})
	}
}

func TestDetectAcceptsCanonicalPayloadLengths(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name    string
		version byte
		size    int
		want    AddressKind
	}{
		{name: "G", version: VersionByteG, size: 32, want: KindG},
		{name: "C", version: VersionByteC, size: 32, want: KindC},
		{name: "M", version: VersionByteM, size: 40, want: KindM},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			addr, err := EncodeStrKey(tc.version, make([]byte, tc.size))
			if err != nil {
				t.Fatalf("EncodeStrKey() error = %v", err)
			}

			kind, err := Detect(addr)
			if err != nil {
				t.Fatalf("Detect() error = %v", err)
			}
			if kind != tc.want {
				t.Fatalf("Detect() = %q, want %q", kind, tc.want)
			}
			if !Validate(addr) {
				t.Fatalf("Validate() = false for a canonical %s address", tc.name)
			}
		})
	}
}
