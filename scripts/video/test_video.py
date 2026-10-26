# python -m unittest discover -s scripts/video
import unittest
from build import plan, srt, VOICE_DELAY, VOICE_TAIL
from tts import norm

T = {"tLead": 4.0, "tEnd": 20.0, "cuts": [[6.0, 8.0]],
     "cues": [{"start": 4.0, "text": "a"}, {"start": 10.0, "text": "b"}, {"start": 15.0, "text": "c"}]}


class Plan(unittest.TestCase):
    def test_no_voice_cuts_inside_cue(self):
        s = plan(T)
        self.assertEqual([round(g["slot"], 3) for g in s], [4.0, 5.0, 5.0])   # 6–8 тайрсан
        self.assertEqual([g["extra"] for g in s], [0.0, 0.0, 0.0])
        self.assertEqual([g["start"] for g in s], [0.0, 4.0, 9.0])

    def test_long_voice_extends_only_its_cue(self):
        s = plan(T, [3.0, 6.0, None])
        self.assertEqual(s[0]["extra"], 0.0)
        self.assertAlmostEqual(s[1]["extra"], VOICE_DELAY + 6.0 + VOICE_TAIL - 5.0)
        self.assertAlmostEqual(s[2]["start"], 9.0 + s[1]["extra"])

    def test_srt_follows_extended_timeline(self):
        s = plan(T, [None, 6.0, None])
        lines = srt(s, ["x", "y", "z"]).split("\n")
        self.assertEqual(lines[5], "00:00:04,000 --> 00:00:10,700")


class Lexicon(unittest.TestCase):
    def test_symbols(self):
        self.assertEqual(norm("Түрээс 1 250 000₮."), "Түрээс 1250000 төгрөг.")
        self.assertEqual(norm("Гэрээ №15"), "Гэрээ дугаар 15")
        self.assertEqual(norm("Е-баримт ба И-Баримт"), "и баримт ба и баримт")
        self.assertEqual(norm("«Next Auto Job +», «Job Create»"), "Некст авто жоб нэмэх, Жоб криэйт")


if __name__ == "__main__":
    unittest.main()
