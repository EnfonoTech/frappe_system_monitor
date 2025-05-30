import frappe, psutil, time, platform, datetime

@frappe.whitelist()
def execute(**kwargs):
    res = frappe._dict({})
    
    if not ('System Manager' in [i.role for i in frappe.get_doc('User', frappe.session.user).roles]):
        return res

    # System Description
    desctable = frappe.render_template(
        "frappe_system_monitor/frappe_system_monitor/page/system_monitor/desctable.html",
        context=dict(
            name=platform.system(),
            release=platform.release(),
            running_since=datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S"),
        ))
    res.desctable = desctable

    # CPU
    cpu = frappe._dict({})
    cpu.percent = psutil.cpu_percent(interval=0)
    cpu.used = psutil.cpu_count() * (cpu.percent / 100)
    cpu.total = psutil.cpu_count()
    cpu_freq_list = [['Time'] + [f'CPU {i}' for i in range(1, psutil.cpu_count(logical=True)+1)]]

    for _ in range(10):
        freqs = psutil.cpu_freq(percpu=True)
        timestamp = datetime.datetime.now().strftime('%H:%M:%S')
        row = [timestamp] + [round(core.current, 2) for core in freqs]
        cpu_freq_list.append(row)
        time.sleep(0.3)

    cpu.cpu_freq_list = cpu_freq_list
    cpu.cpu_max = freqs[0].max if freqs else None

    # RAM
    virtual_mem = psutil.virtual_memory()
    memory = frappe._dict({
        "percent": virtual_mem.percent,
        "used": virtual_mem.used,
        "total": virtual_mem.total
    })

    # Disk
    disk_usage = psutil.disk_usage('/')
    disk = frappe._dict({
        "percent": disk_usage.percent,
        "used": disk_usage.used,
        "total": disk_usage.total
    })

    res.cpu = cpu
    res.memory = memory
    res.disk = disk

    return res