import frappe, psutil, time, platform, datetime

@frappe.whitelist()
def execute(**kwargs):
    res = frappe._dict({})
    if not ('System Manager' in [i.role for i in frappe.get_doc('User', frappe.session.user).roles]):
        return res

    desctable = frappe.render_template(
        "frappe_system_monitor/frappe_system_monitor/page/system_monitor/desctable.html",
        context=dict(
            name=platform.system(),
            release=platform.release(),
            running_since=datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S"),
        ))
    res.desctable = desctable

    cpu = frappe._dict({})
    cpu.percent = psutil.cpu_percent(interval=0)
    initial_cpu = psutil.cpu_freq(percpu=True)
    cpu_max = initial_cpu[0].max
    cpu_freq_list = [['Time'] + [f'CPU {i}' for i in range(1, len(initial_cpu)+1)]]

    for _ in range(10):
        freqs = psutil.cpu_freq(percpu=True)
        timestamp = datetime.datetime.now().strftime('%H:%M:%S')
        row = [timestamp] + [round(core.current, 2) for core in freqs]
        cpu_freq_list.append(row)
        time.sleep(0.3)

    cpu.cpu_freq_list = cpu_freq_list
    cpu.cpu_max = cpu_max

    memory = frappe._dict({})
    disk = frappe._dict({})
    memory.percent = psutil.virtual_memory()[2]
    disk.percent = psutil.disk_usage('/')[3]

    res.memory = memory
    res.cpu = cpu
    res.disk = disk

    return res