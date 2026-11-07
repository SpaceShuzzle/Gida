package address

// Detect identifies the AddressKind of a Stellar address string.
// Supported kinds include KindG (Ed25519), KindM (Muxed/SEP-23), and KindC (Contract).
func Detect(addr string) (AddressKind, error) {
	versionByte, payload, err := DecodeStrKey(addr)
	if err != nil {
		return "", err
	}

	switch versionByte {
	case VersionByteG:
		if len(payload) != 32 {
			return "", ErrInvalidLengthError
		}
		return KindG, nil
	case VersionByteM:
		// 32-byte ed25519 key + 8-byte big-endian muxed id.
		if len(payload) != 40 {
			return "", ErrInvalidLengthError
		}
		return KindM, nil
	case VersionByteC:
		if len(payload) != 32 {
			return "", ErrInvalidLengthError
		}
		return KindC, nil
	default:
		return "", ErrUnknownVersionByteError
	}
}
