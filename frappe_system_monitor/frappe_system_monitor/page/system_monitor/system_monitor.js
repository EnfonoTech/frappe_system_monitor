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
				<div class="row">
					<div class="col-md-4" id="desc_table" style="padding: 10px;"></div>

					<div class="col-md-8">
						<div class="row text-center">
							<div class="col-md-4 mb-4">
								<h4>CPU Usage</h4>
								<div id="cpu_chart" style="height: 200px;"></div>
							</div>
							<div class="col-md-4 mb-4">
								<h4>RAM Usage</h4>
								<div id="ram_chart" style="height: 200px;"></div>
							</div>
							<div class="col-md-4 mb-4">
								<h4>Disk Usage</h4>
								<div id="disk_chart" style="height: 200px;"></div>
							</div>
						</div>
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

let chart_data = () => {
	get_chart_data();
	setInterval(() => {
		get_chart_data();
	}, 3000);
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
	const cpu_data = {
		labels: ["CPU"],
		datasets: [{
			name: "CPU",
			values: [data.cpu.percent]
		}]
	};
	const ram_data = {
		labels: ["RAM"],
		datasets: [{
			name: "RAM",
			values: [data.memory.percent]
		}]
	};
	const disk_data = {
		labels: ["Disk"],
		datasets: [{
			name: "Disk",
			values: [data.disk.percent]
		}]
	};

	if (!cpu_chart) {
		cpu_chart = new frappe.Chart("#cpu_chart", {
			title: "CPU Usage (%)",
			data: cpu_data,
			type: "bar",
			height: 200,
			colors: ['#f39c12']
		});
	} else {
		cpu_chart.update(cpu_data);
	}

	if (!ram_chart) {
		ram_chart = new frappe.Chart("#ram_chart", {
			title: "RAM Usage (%)",
			data: ram_data,
			type: "bar",
			height: 200,
			colors: ['#3498db']
		});
	} else {
		ram_chart.update(ram_data);
	}

	if (!disk_chart) {
		disk_chart = new frappe.Chart("#disk_chart", {
			title: "Disk Usage (%)",
			data: disk_data,
			type: "bar",
			height: 200,
			colors: ['#2ecc71']
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
				name: `CPU ${core}`,
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
			colors: ['#e74c3c', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f', '#e67e22', '#7f8c8d']
		});
	} else {
		freq_chart.update(freq_data);
	}
};
