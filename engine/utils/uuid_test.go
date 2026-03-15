package utils

import (
	"strings"
	"testing"
)

func TestProjectUUID(t *testing.T) {
	uuid := ProjectUUID()
	if !strings.HasPrefix(uuid, "PID") {
		t.Errorf("ProjectUUID() = %q, want prefix 'PID'", uuid)
	}

	if len(uuid) != 35 {
		t.Errorf("ProjectUUID() length = %d, want 35", len(uuid))
	}
}

func TestBuildUUID(t *testing.T) {
	uuid := BuildUUID()
	if !strings.HasPrefix(uuid, "BID") {
		t.Errorf("BuildUUID() = %q, want prefix 'BID'", uuid)
	}
	if len(uuid) != 35 {
		t.Errorf("BuildUUID() length = %d, want 35", len(uuid))
	}
}

func TestCaseUUID(t *testing.T) {
	uuid := CaseUUID()
	if !strings.HasPrefix(uuid, "CID") {
		t.Errorf("CaseUUID() = %q, want prefix 'CID'", uuid)
	}
	if len(uuid) != 35 {
		t.Errorf("CaseUUID() length = %d, want 35", len(uuid))
	}
}

func TestUUIDsAreUnique(t *testing.T) {
	uuids := make(map[string]bool)
	for i := 0; i < 100; i++ {
		uuid := BuildUUID()
		if uuids[uuid] {
			t.Errorf("Duplicate UUID found: %s", uuid)
		}
		uuids[uuid] = true
	}
}
