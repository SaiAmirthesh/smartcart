import sys
if sys.prefix == '/usr':
    sys.real_prefix = sys.prefix
    sys.prefix = sys.exec_prefix = '/home/hari-aswath/Projects/smartcart/simulation/smartcart_ws/install/smartcart_human'
