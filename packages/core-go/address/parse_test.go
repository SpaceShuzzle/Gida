package address

import "testing"

func TestParseMuxedAddress(t *testing.T) {
	const baseG = "GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI"

	tests := []struct {
		name       string
		mAddress   string
		wantBaseG  string
		wantMuxed  uint64
		shouldFail bool
	}{
		{
			name:      "decode id=0 boundary case",
			mAddress:  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACAAAAAAAAAAAAD672",
			wantBaseG: baseG,
			wantMuxed: 0,
		},
		{
			name:      "decode id=1 small positive case",
			mAddress:  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACAAAAAAAAAAAAHOO2",
			wantBaseG: baseG,
			wantMuxed: 1,
		},
		{
			name:      "decode id=2^53 precision boundary",
			mAddress:  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACABAAAAAAAAAAAFZG",
			wantBaseG: baseG,
			wantMuxed: 9007199254740992,
		},
		{
			name:      "decode id=2^53+1 interop canary",
			mAddress:  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACABAAAAAAAAAAEVIG",
			wantBaseG: baseG,
			wantMuxed: 9007199254740993,
		},
		{
			name:      "decode id=2^64-1 max uint64",
			mAddress:  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQAD7777777777774OFW",
			wantBaseG: baseG,
			wantMuxed: 18446744073709551615,
		},
		{
			name:       "invalid M-address should return error",
			mAddress:   "MZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
			shouldFail: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			addr, err := Parse(tt.mAddress)

			if tt.shouldFail {
				if err == nil {
					t.Fatalf("expected error, got none")
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if addr.Kind != KindM {
				t.Fatalf("expected KindM, got %v", addr.Kind)
			}

			if addr.Raw != tt.mAddress {
				t.Errorf("Raw = %s, want %s", addr.Raw, tt.mAddress)
			}

			if addr.BaseG != tt.wantBaseG {
				t.Errorf("BaseG = %s, want %s", addr.BaseG, tt.wantBaseG)
			}

			if addr.MuxedID != tt.wantMuxed {
				t.Errorf("MuxedID = %d, want %d", addr.MuxedID, tt.wantMuxed)
			}
		})
	}
}


func TestParseWarnsForNonCanonicalCase(t *testing.T) {
	const canonical = "GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI"
	lowercase := "gaycuyt553c5lhve2xpw5gmejt4bxgm7ahmjwlapzp53kjo7eiqadrsi"

	addr, err := Parse(lowercase)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if addr.Raw != canonical {
		t.Fatalf("Parse() Raw = %q, want %q", addr.Raw, canonical)
	}
	if len(addr.Warnings) != 1 {
		t.Fatalf("Parse() warnings = %d, want 1", len(addr.Warnings))
	}
	warning := addr.Warnings[0]
	if warning.Code != WarnNonCanonicalAddress {
		t.Fatalf("warning code = %q, want %q", warning.Code, WarnNonCanonicalAddress)
	}
	if warning.Severity != "warn" {
		t.Fatalf("warning severity = %q, want warn", warning.Severity)
	}
	if warning.Normalization == nil {
		t.Fatalf("warning normalization = nil")
	}
	if warning.Normalization.Original != lowercase || warning.Normalization.Normalized != canonical {
		t.Fatalf("normalization = %#v", warning.Normalization)
	}

	canonicalAddr, err := Parse(canonical)
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if len(canonicalAddr.Warnings) != 0 {
		t.Fatalf("canonical address warnings = %d, want 0", len(canonicalAddr.Warnings))
	}
}
