package monitor

import (
	"nanomon/services/common/types"
	"testing"
)

type httpTestCase struct {
	name           string
	target         string
	expectedStatus int
	expectedRunOK  bool
	rule           string
}

var cases = []httpTestCase{
	{
		name:           "Good",
		target:         "https://example.net",
		expectedStatus: types.StatusOK,
		expectedRunOK:  true,
	},
	{
		name:           "Bad URL",
		target:         "frogs://jumping",
		expectedStatus: types.StatusFailed,
		expectedRunOK:  false,
	},
	{
		name:           "Bad host",
		target:         "http://geezer_butler",
		expectedStatus: types.StatusFailed,
		expectedRunOK:  false,
	},
	{
		name:           "Rule Status 404",
		target:         "http://httpstat.us/404",
		expectedStatus: types.StatusError,
		expectedRunOK:  false,
		rule:           "status == 200",
	},
	{
		name:           "Rule Body check",
		target:         "https://example.net",
		expectedStatus: types.StatusOK,
		expectedRunOK:  true,
		rule:           "body =~ 'Example Domain'",
	},
	{
		name:           "Rule Resp Time",
		target:         "https://example.net",
		expectedStatus: types.StatusOK,
		expectedRunOK:  true,
		rule:           "respTime > 0 && respTime < 20000",
	},
}

func TestHTTPMonitor(t *testing.T) {
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {

			m := NewMonitor(nil)
			m.Name = tc.name
			m.Enabled = true
			m.Type = typeHTTP
			m.Target = tc.target
			m.Rule = tc.rule

			ok, res := m.run()

			if ok != tc.expectedRunOK {
				t.Errorf("HTTP monitor should return %t", tc.expectedRunOK)
			}

			if res != nil && res.Status != tc.expectedStatus {
				t.Errorf("HTTP monitor should return %d", tc.expectedStatus)
			}
		})
	}
}
