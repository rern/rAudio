import unittest

from backend.filters import filter_options, pipeline_step_options


class FiltersTest(unittest.TestCase):

    def test_filter_options_with_samplerate(self):
        self.assertEqual(
            filter_options(
                ["filter_44100_2", "filter_44100_8", "filter_48000_2", "filter_48000_8"],
                "filter_$samplerate$_2"
            ),
            [
                {"name": "filter_44100_2", "samplerate": 44100},
                {"name": "filter_48000_2", "samplerate": 48000}
            ]
        )

    def test_filter_options_with_channels(self):
        self.assertEqual(
            filter_options(
                ["filter_44100_2", "filter_44100_8", "filter_48000_2", "filter_48000_8"],
                "filter_44100_$channels$"
            ),
            [
                {"name": "filter_44100_2", "channels": 2},
                {"name": "filter_44100_8", "channels": 8}
            ]
        )

    def test_filter_options_with_samplerate_and_channels(self):
        self.assertEqual(
            filter_options(
                ["filter_44100_2", "filter_44100_8", "filter_48000_2", "filter_48000_8"],
                "filter_$samplerate$_$channels$"
            ),
            [
                {"name": "filter_44100_2", "samplerate": 44100, "channels": 2},
                {"name": "filter_44100_8", "samplerate": 44100, "channels": 8},
                {"name": "filter_48000_2", "samplerate": 48000, "channels": 2},
                {"name": "filter_48000_8", "samplerate": 48000, "channels": 8}
            ]
        )
        self.assertEqual(
            filter_options(
                ["filter_2_44100", "filter_8_44100", "filter_2_48000", "filter_8_48000"],
                "filter_$channels$_$samplerate$"
            ),
            [
                {"name": "filter_2_44100", "samplerate": 44100, "channels": 2},
                {"name": "filter_8_44100", "samplerate": 44100, "channels": 8},
                {"name": "filter_2_48000", "samplerate": 48000, "channels": 2},
                {"name": "filter_8_48000", "samplerate": 48000, "channels": 8}
            ]
        )

    def test_filter_options_without_samplerate_and_channels(self):
        self.assertEqual(
            filter_options(
                ["filter_44100_2", "filter_44100_8", "filter_48000_2", "filter_48000_8"],
                "filter_44100_2"
            ),
            [{"name": "filter_44100_2"}]
        )

    def test_filter_options_handles_filenames_with_brackets(self):
        self.assertEqual(
            filter_options(
                [
                    "filter_((44100)_(2))",
                    "filter_((44100)_(8))",
                    "filter_((48000)_(2))",
                    "filter_((48000)_(8))"
                ],
                "filter_(($samplerate$)_($channels$))"
            ),
            [
                {"name": "filter_((44100)_(2))", "samplerate": 44100, "channels": 2},
                {"name": "filter_((44100)_(8))", "samplerate": 44100, "channels": 8},
                {"name": "filter_((48000)_(2))", "samplerate": 48000, "channels": 2},
                {"name": "filter_((48000)_(8))", "samplerate": 48000, "channels": 8}
            ]
        )

    def test_pipeline_step_options_for_only_one_samplerate_and_channel_option(self):
        config = {
            "devices": {
                "samplerate": 44100,
                "capture": {"channels": 2}
            },
            "filters": {
                "Filter1": {
                    "type": "Conv",
                    "parameters": {
                        "type": "Raw",
                        "filename": "../coeffs/filter-44100-2"
                    }
                },
                "Filter2": {
                    "type": "Conv",
                    "parameters": {
                        "type": "Wav",
                        "filename": "../coeffs/filter-$samplerate$-$channels$"
                    }
                },
                "irrelevantFilter": {
                    "type": "something else",
                    "parameters": {}
                }
            },
            "pipeline": [
                {
                    "channel": 0,
                    "type": "Filter",
                    "names": ["Filter1", "Filter2", "irrelevantFilter"]
                }
            ]
        }
        filter_file_names = [
            "filter-44100-2",
            "filter-44100-8",
            "filter-48000-2",
            "filter-48000-8"
        ]
        self.assertEqual(
            pipeline_step_options(filter_file_names, config, 0),
            [{"name": "44100 Hz - 2 Channels", "samplerate": 44100, "channels": 2}]
        )

    def test_pipeline_step_options_for_many_samplerate_and_channel_options(self):
        config = {
            "devices": {
                "samplerate": 44100,
                "capture": {"channels": 2}
            },
            "filters": {
                "Filter1": {
                    "type": "Conv",
                    "parameters": {
                        "type": "Raw",
                        "filename": "../coeffs/filter-$samplerate$-$channels$"
                    }
                },
                "Filter2": {
                    "type": "Conv",
                    "parameters": {
                        "type": "Raw",
                        "filename": "../coeffs/filter-$samplerate$-$channels$"
                    }
                }
            },
            "pipeline": [
                {
                    "channel": 0,
                    "type": "Filter",
                    "names": ["Filter1", "Filter2"]
                }
            ]
        }
        filter_file_names = [
            "filter-44100-2",
            "filter-44100-8",
            "filter-48000-2",
            "filter-48000-8"
        ]
        self.assertEqual(
            pipeline_step_options(filter_file_names, config, 0),
            [
                {"name": "44100 Hz - 2 Channels", "samplerate": 44100, "channels": 2},
                {"name": "44100 Hz - 8 Channels", "samplerate": 44100, "channels": 8},
                {"name": "48000 Hz - 2 Channels", "samplerate": 48000, "channels": 2},
                {"name": "48000 Hz - 8 Channels", "samplerate": 48000, "channels": 8}
            ]
        )


if __name__ == '__main__':
    unittest.main()
