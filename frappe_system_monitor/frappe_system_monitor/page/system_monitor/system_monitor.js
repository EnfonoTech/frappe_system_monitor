frappe.pages['system-monitor'].on_page_load = function(wrapper) {
	new MyPage(wrapper);
};

MyPage = Class.extend({
	init: function(wrapper){
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: 'System Monitor',
			single_column: true
		});
		frappe.require('/assets/frappe_system_monitor/js/loader.js', () => {
			this.make();
		});
	},

	make: function(){
		$(frappe.render_template(`
			<div class="container-fluid">
				<div class="col-md-6"id="desc_table" style="padding: 10px;"></div>
				<div class="row">
						<div class="col-md-4">
							<h4>CPU Usage</h4>
							<div id="cpu_chart" style="height: 200px;"></div>
							<p id="cpu_usage_text" class="mt-2 text-center"></p>
						</div>
						<div class="col-md-4">
							<h4>RAM Usage</h4>
							<div id="ram_chart" style="height: 200px;"></div>
							<p id="ram_usage_text" class="mt-2 text-center"></p>
						</div>
						<div class="col-md-4">
							<h4>Disk Usage</h4>
							<div id="disk_chart" style="height: 200px;"></div>
							<p id="disk_usage_text" class=" mt-2 text-center"></p>
						</div>
				</div>
				<hr>
				<h4 class="text-center">CPU Frequency History</h4>
				<div id="cpu_frequency_div" style="width: 100%; height: 400px;"></div>
			</div>
		`, this)).appendTo(this.page.main);

		chart_data();
	}
});

let cpu_chart = null;
let ram_chart = null;
let disk_chart = null;
let freq_chart = null;
let time_labels = [];
let freq_data_by_cpu = [];
let cpu_usage_data = { name: "CPU", values: [] };
let ram_usage_data = { name: "RAM", values: [] };
let disk_usage_data = { name: "Disk", values: [] };

let chart_data = () => {
	get_chart_data();
	setInterval(() => {
		get_chart_data();
	}, 60000);
};

let get_chart_data = () => {
	frappe.call({
		method: "frappe_system_monitor.frappe_system_monitor.page.system_monitor.system_monitor.execute",
		callback: function(r) {
			if (!r.message) return;
			const data = r.message;
			document.querySelector('#desc_table').innerHTML = data.desctable;
			render_resource_charts(data);
			render_freq_chart(data.cpu);
		}
	});
};

let render_resource_charts = (data) => {
	const now = new Date().toLocaleTimeString();

	if (time_labels.length >= 20) time_labels.shift();
	time_labels.push(now);

	// CPU
	if (cpu_usage_data.values.length >= 20) cpu_usage_data.values.shift();
	cpu_usage_data.values.push(data.cpu.percent);

	const cpu_data = {
		labels: [...time_labels],
		datasets: [cpu_usage_data]
	};
	document.getElementById("cpu_usage_text").innerText =
		`${data.cpu.used.toFixed(2)} / ${data.cpu.total} Cores`;

	// RAM
	if (ram_usage_data.values.length >= 20) ram_usage_data.values.shift();
	ram_usage_data.values.push(data.memory.percent);

	const ram_data = {
		labels: [...time_labels],
		datasets: [ram_usage_data]
	};
	document.getElementById("ram_usage_text").innerText =
		`${(data.memory.used / (1024 ** 3)).toFixed(2)} / ${(data.memory.total / (1024 ** 3)).toFixed(2)} GB`;

	// DISK
	if (disk_usage_data.values.length >= 20) disk_usage_data.values.shift();
	disk_usage_data.values.push(data.disk.percent);

	const disk_data = {
		labels: [...time_labels],
		datasets: [disk_usage_data]
	};
	document.getElementById("disk_usage_text").innerText =
		`${(data.disk.used / (1024 ** 3)).toFixed(2)} / ${(data.disk.total / (1024 ** 3)).toFixed(2)} GB`;

	// Create or Update Charts
	if (!cpu_chart) {
		cpu_chart = new frappe.Chart("#cpu_chart", {
			title: "CPU Usage (%)",
			data: cpu_data,
			type: "line",
			height: 200,
			colors: ['#f39c12'],
			lineOptions: {
				regionFill: 1, 
			},
			areaOptions: {
				showArea: true, 
				opacity: 0.1,   
			}
			
		});
	} else {
		cpu_chart.update(cpu_data);
	}

	if (!ram_chart) {
		ram_chart = new frappe.Chart("#ram_chart", {
			title: "RAM Usage (%)",
			data: ram_data,
			type: "line",
			height: 200,
			colors: ['#3498db'],
			lineOptions: {
				regionFill: 1,
			},
			areaOptions: {
				showArea: true, 
				opacity: 0.1,   
			}
			});
	} else {
		ram_chart.update(ram_data);
	}

	if (!disk_chart) {
		disk_chart = new frappe.Chart("#disk_chart", {
			title: "Disk Usage (%)",
			data: disk_data,
			type: "line",
			height: 200,
			colors: ['#2ecc71'],
			lineOptions: {
				regionFill: 1,
			},
			areaOptions: {
				showArea: true,
				opacity: 0.1,   
			}
		});
	} else {
		disk_chart.update(disk_data);
	}
};

let render_freq_chart = (cpu) => {
	const now = new Date().toLocaleTimeString();
	if (time_labels.length >= 20) time_labels.shift();
	time_labels.push(now);

	const cores = cpu.cpu_freq_list[0].slice(1);
	const values = cpu.cpu_freq_list[1].slice(1).map(freq => parseFloat(freq));

	if (freq_data_by_cpu.length === 0) {
		cores.forEach((core, index) => {
			freq_data_by_cpu.push({
				name: `${core}`,
				values: [values[index]]
			});
		});
	} else {
		freq_data_by_cpu.forEach((dataset, index) => {
			if (dataset.values.length >= 20) dataset.values.shift();
			dataset.values.push(values[index]);
		});
	}

	const freq_data = {
		labels: [...time_labels],
		datasets: freq_data_by_cpu
	};

	if (!freq_chart) {
		freq_chart = new frappe.Chart("#cpu_frequency_div", {
			title: "CPU Frequency (MHz)",
			data: freq_data,
			type: "line",
			height: 300,
			colors: ['#e74c3c', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#7f8c8d'],
			lineOptions: {
				regionFill: 1,
			},
			areaOptions: {
				showArea: true, 
				opacity: 0.3,   
			}
		});
	} else {
		freq_chart.update(freq_data);
	}
};
