#!/usr/bin/env python3
"""Generate a board's .kicad_sch from its spec module.

Usage: python3 gen_schematic.py <spec_module>

<spec_module> is either a filesystem path to a .py file or a dotted module
name importable on sys.path (e.g. board_a_spec, test_spec_smoke).
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schgen_core


def main(argv):
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('spec_module',
                        help='path to a .py spec module, or a dotted module name')
    args = parser.parse_args(argv)

    try:
        spec = schgen_core.load_spec_module(args.spec_module)
        schgen_core.generate(spec)
    except schgen_core.SchgenError as err:
        print(f'gen_schematic: error: {err}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
