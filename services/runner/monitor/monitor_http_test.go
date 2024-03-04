// ----------------------------------------------------------------------------
// Copyright (c) Ben Coleman, 2023. Licensed under the MIT License.
// NanoMon Runner - Tests for HTTP monitor
// ----------------------------------------------------------------------------

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
	props          map[string]string
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
		target:         "goat://smelly",
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
		target:         "https://www.bbc.co.uk/goats",
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
	{
		name:           "Rule Regex match string",
		target:         "https://example.net",
		expectedStatus: types.StatusOK,
		expectedRunOK:  true,
		rule:           "regexMatch == 'Example Domain'",
		props: map[string]string{
			"bodyRegex": "<title>(.*?)</title>",
		},
	},
	{
		name:           "Rule Regex match number",
		target:         "https://example.net",
		expectedStatus: types.StatusOK,
		expectedRunOK:  true,
		rule:           "regexMatch >= 700",
		props: map[string]string{
			"bodyRegex": "media \\(max-width: (.*?)px\\)",
		},
	},
	{
		name:           "Rule Regex bad",
		target:         "https://example.net",
		expectedStatus: types.StatusFailed,
		expectedRunOK:  false,
		rule:           "regexMatch == 'whatever'",
		props: map[string]string{
			"bodyRegex": "*hello",
		},
	},
}

func TestHTTPMonitor(t *testing.T) {
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {

			m := NewMonitor(nil)
			m.Name = tc.name
			m.Enabled = true
			m.Type = TypeHTTP
			m.Target = tc.target
			m.Rule = tc.rule

			m.Properties = tc.props

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
