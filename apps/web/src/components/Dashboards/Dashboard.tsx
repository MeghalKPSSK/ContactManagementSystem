// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import ReactApexChart from 'react-apexcharts';
import ApexCharts from 'apexcharts';
import * as XLSX from 'xlsx';
import { Card, List, Tag, Space, Select, Typography, Spin } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExcel, faImage, faTachometerAlt } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import styles from './Dashboard.module.css';
import apiService from '../../services/apiService';
import PaginationBar from '../Pagination/PaginationBar';
import { useThemePreferences } from '../../contexts/ThemePreferencesContext';

const { Title } = Typography;

const chartColors = {
  pie: [
    '#4B70DD',  // Royal Blue
    '#8E54E9',  // Purple
    '#E94584',  // Pink Red
    '#4B9EFF',  // Light Blue
    '#B4CEFF',  // Softer Blue
    '#FFB3B3',  // Light Red
  ],
  bar: [
    '#8E54E9',  // Purple for favorites
    '#4B70DD'   // Royal Blue for regular
  ]
};

function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);
  const { preferences } = useThemePreferences();
  const [tagDistribution, setTagDistribution] = useState({ labels: [], counts: [] });
  const [favoritesData, setFavoritesData] = useState({ favorite: 0, regular: 0 });
  const [groupDistribution, setGroupDistribution] = useState({ labels: [], groupContactsData: [], tagContactsData: [] });
  const [loading, setLoading] = useState({
    contacts: false,
    charts: false,
    groupsChart: false
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const [pieOptions, setPieOptions] = useState({
    series: [],
    options: {
      chart: { 
        type: 'pie',
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          },
          export: {
            svg: true,
            png: true,
            csv: false
          }
        },
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      labels: [],
      colors: chartColors.pie,
      legend: {
        position: 'bottom',
        markers: {
          fillColors: chartColors.pie,
          radius: 4,
          strokeWidth: 0
        },
        labels: {
          colors: 'var(--text-secondary)'
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: { height: 260 },
          legend: { position: 'bottom' }
        }
      }],
      theme: {
        mode: 'light',
        palette: 'palette1'
      },
      stroke: {
        width: 1,
        colors: ['#fff']
      },
      plotOptions: {
        pie: {
          donut: {
            size: '0%'
          },
          expandOnClick: true
        }
      },
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      tooltip: {
        style: {
          fontSize: '14px'
        },
        y: {
          formatter: (value) => `${value} contacts`,
          title: {
            formatter: (seriesName) => seriesName
          }
        },
        theme: 'light',
        fillSeriesColor: false
      }
    }
  });

  const [barOptions, setBarOptions] = useState({
    series: [{
      name: 'Contacts',
      data: [0, 0]
    }],
    options: {
      chart: {
        type: 'bar',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          },
          export: {
            svg: true,
            png: true,
            csv: false
          }
        },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        }
      },
      colors: chartColors.bar,
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '60%',
          distributed: true,
          dataLabels: {
            position: 'top'
          },
          hover: {
            color: '#8E54E9'
          },
          colors: {
            ranges: [{
              from: 0,
              to: 0,
              color: chartColors.bar[0]
            }, {
              from: 1,
              to: 1,
              color: chartColors.bar[1]
            }]
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 600,
          colors: ['#000', '#000'] // Black text for better visibility
        },
        offsetY: -20,
        formatter: function (val) {
          return val
        }
      },
      xaxis: {
        categories: ['Favorite', 'Regular'],
        labels: {
          style: {
            colors: ['var(--text-secondary)', 'var(--text-secondary)'],
            fontSize: '14px'
          }
        }
      },
      fill: {
        opacity: 0.9
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--text-secondary)'
          }
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        markers: {
          fillColors: chartColors.bar,
          radius: 4,
          strokeWidth: 0
        },
        labels: {
          colors: 'var(--text-secondary)'
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      theme: {
        mode: 'light'
      },
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value) => `${value} contacts`
        },
        theme: 'light'
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: { height: 260 },
          legend: { position: 'bottom' }
        }
      }]
    }
  });
  const [groupsOptions, setGroupsOptions] = useState({
    series: [{
      name: 'Group Contacts',
      type: 'line',
      data: [0]
    }, {
      name: 'Tag Contacts',
      type: 'bar',
      data: [0]
    }],
    options: {
      chart: {
        type: 'line',
        height: 400,
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          },
          export: {
            svg: true,
            png: true,
            csv: false
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      colors: ['#4B70DD', '#8E54E9'], // Blue for line, Purple for bars
      stroke: {
        width: [3, 0], // Line width for line chart, 0 for bar chart
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%',
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: false // Disable data labels, values visible on hover
      },
      labels: ['No Data'],
      xaxis: {
        type: 'category',
        categories: ['No Data'],
        labels: {
          style: {
            colors: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500
          },
          rotate: -35,
          rotateAlways: false,
          hideOverlappingLabels: true,
          showDuplicates: false,
          trim: true,
          maxHeight: 120
        }
      },
      yaxis: [{
        title: {
          text: 'Contact Count',
          style: {
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500
          }
        },
        labels: {
          style: {
            colors: 'var(--text-secondary)',
            fontSize: '12px'
          },
          formatter: function (val) {
            return Math.floor(val)
          }
        },
        min: 0
      }],
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        floating: false,
        offsetY: -10,
        markers: {
          width: 12,
          height: 12,
          fillColors: ['#4B70DD', '#8E54E9'],
          strokeWidth: 0,
          radius: 2
        },
        labels: {
          colors: 'var(--text-secondary)',
          useSeriesColors: false
        },
        itemMargin: {
          horizontal: 20,
          vertical: 5
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: [{
          formatter: (value) => `${value} contacts`
        }, {
          formatter: (value) => `${value} contacts`
        }],
        theme: 'light',
        style: {
          fontSize: '12px'
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: 300
          },
          legend: {
            position: 'bottom'
          },
          xaxis: {
            labels: {
              rotate: -45
            }
          }
        }
      }]
    }
  });

  const fetchContactsData = useCallback(async (page = 1, pageSize = pagination.pageSize) => {
    setLoading(prev => ({ ...prev, contacts: true }));
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      
      // Fetch tags for dropdown only if tags array is empty
      if (tags.length === 0) {
        const tagsData = await apiService.fetch(`/contacts/tags?userId=${userId}`, {
          method: 'GET'
        });
        if (tagsData.success) {
          setTags(tagsData.tags);
        }
      }
      
      // Fetch filtered contacts
      const contactsData = await apiService.fetch(
        `/dashboard/contacts?` + 
        new URLSearchParams({
          userId,
          tags: selectedTags.length > 0 ? selectedTags.join(',') : '',
          page,
          pageSize
        }).toString(),
        {
          method: 'GET'
        }
      );

      if (contactsData.success) {
        setContacts(contactsData.contacts);
        setPagination(prev => ({
          ...prev,
          current: page,
          pageSize,
          total: contactsData.total
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }));
    }
  }, [selectedTags, pagination.pageSize, tags.length]);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, charts: true }));
      const userId = JSON.parse(localStorage.getItem('user')).uid;

      const [tagsData, favoritesData] = await Promise.all([
        apiService.fetch(`/dashboard/tags-distribution?userId=${userId}`, {
          method: 'GET'
        }),
        apiService.fetch(`/dashboard/favorites-count?userId=${userId}`, {
          method: 'GET'
        })
      ]);

      if (tagsData.success && favoritesData.success) {
        setTagDistribution({ labels: tagsData.labels || [], counts: tagsData.counts || [] });
        setFavoritesData({ favorite: favoritesData.favorite || 0, regular: favoritesData.regular || 0 });
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(prev => ({ ...prev, charts: false }));
    }
  }, []);

  const fetchGroupsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, groupsChart: true }));
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      console.log('Fetching groups data for user:', userId);

      const groupsData = await apiService.fetch(`/dashboard/groups-stats?userId=${userId}`, {
        method: 'GET'
      });

      console.log('Groups API response:', groupsData);

      if (groupsData.success) {
        console.log('Groups data:', groupsData.data);
        
        const { group_data, tag_data } = groupsData.data;
        
        // Handle empty data cases
        const hasGroupData = group_data && group_data.length > 0;
        const hasTagData = tag_data && tag_data.length > 0;
        
        let allLabels = [];
        let groupContactsData = [];
        let tagContactsData = [];
        
        if (hasGroupData && hasTagData) {
          // Combine labels from both datasets, prioritizing groups
          const groupLabels = group_data.map(item => item.name);
          const tagLabels = tag_data.map(item => item.name);
          
          // Create a combined label set (first groups, then tags not in groups)
          allLabels = [...groupLabels];
          const uniqueTagLabels = tagLabels.filter(label => !groupLabels.includes(label));
          allLabels = [...allLabels, ...uniqueTagLabels.slice(0, 5)]; // Limit total labels
          
          // Map data to combined labels
          groupContactsData = allLabels.map(label => {
            const groupItem = group_data.find(item => item.name === label);
            return groupItem ? groupItem.count : 0;
          });
          
          tagContactsData = allLabels.map(label => {
            const tagItem = tag_data.find(item => item.name === label);
            return tagItem ? tagItem.count : 0;
          });
        } else if (hasGroupData) {
          allLabels = group_data.map(item => item.name);
          groupContactsData = group_data.map(item => item.count);
          tagContactsData = new Array(allLabels.length).fill(0);
        } else if (hasTagData) {
          allLabels = tag_data.map(item => item.name);
          groupContactsData = new Array(allLabels.length).fill(0);
          tagContactsData = tag_data.map(item => item.count);
        } else {
          // No data available
          allLabels = ['No Data'];
          groupContactsData = [0];
          tagContactsData = [0];
        }
        
        setGroupDistribution({ labels: allLabels, groupContactsData, tagContactsData });
      } else {
        console.error('Groups API failed:', groupsData);
      }
    } catch (error) {
      console.error('Error fetching groups data:', error);
    } finally {
      setLoading(prev => ({ ...prev, groupsChart: false }));
    }
  }, []);

  useEffect(() => {
    const palette = preferences.dashboardColors;
    const tagsType = preferences.dashboardChartTypes.tags;
    const favoritesType = preferences.dashboardChartTypes.favorites;

    setPieOptions((previous) => ({
      ...previous,
      series: tagDistribution.counts,
      options: {
        ...previous.options,
        chart: { ...previous.options.chart, id: 'dashboard-tags-chart', type: tagsType, toolbar: { ...previous.options.chart.toolbar, show: false } },
        labels: tagDistribution.labels,
        colors: palette,
        plotOptions: {
          ...previous.options.plotOptions,
          pie: {
            ...previous.options.plotOptions.pie,
            donut: { ...previous.options.plotOptions.pie.donut, size: tagsType === 'donut' ? '58%' : '0%' },
          },
        },
        legend: { ...previous.options.legend, markers: { ...previous.options.legend.markers, fillColors: palette } },
      },
    }));

    setBarOptions((previous) => ({
      ...previous,
      series: [{ name: 'Contacts', data: [favoritesData.favorite, favoritesData.regular] }],
      options: {
        ...previous.options,
        chart: { ...previous.options.chart, id: 'dashboard-favorites-chart', type: favoritesType, toolbar: { ...previous.options.chart.toolbar, show: false } },
        colors: palette.slice(0, 2),
        dataLabels: { ...previous.options.dataLabels, enabled: false },
        plotOptions: {
          ...previous.options.plotOptions,
          bar: {
            ...previous.options.plotOptions.bar,
            colors: {
              ranges: [
                { from: 0, to: 0, color: palette[0] },
                { from: 1, to: 1, color: palette[1] },
              ],
            },
          },
        },
        legend: { ...previous.options.legend, markers: { ...previous.options.legend.markers, fillColors: palette.slice(0, 2) } },
      },
    }));
  }, [preferences.dashboardChartTypes, preferences.dashboardColors, tagDistribution, favoritesData]);

  useEffect(() => {
    const chartType = preferences.dashboardChartTypes.groups;
    const isMixed = chartType === 'mixed';
    const groupSeriesType = isMixed ? 'line' : chartType;
    const tagSeriesType = isMixed ? 'bar' : chartType;
    const palette = preferences.dashboardColors.slice(0, 2);

    setGroupsOptions((previous) => ({
      ...previous,
      series: [
        { ...previous.series[0], type: groupSeriesType, data: groupDistribution.groupContactsData },
        { ...previous.series[1], type: tagSeriesType, data: groupDistribution.tagContactsData },
      ],
      options: {
        ...previous.options,
        chart: { ...previous.options.chart, id: 'dashboard-groups-chart', type: isMixed ? 'line' : chartType, toolbar: { ...previous.options.chart.toolbar, show: false } },
        colors: palette,
        labels: groupDistribution.labels,
        xaxis: { ...previous.options.xaxis, categories: groupDistribution.labels },
        stroke: { ...previous.options.stroke, width: isMixed ? [3, 0] : [3, 3] },
        fill: { ...previous.options.fill, opacity: chartType === 'area' ? 0.28 : 0.9 },
        legend: { ...previous.options.legend, markers: { ...previous.options.legend.markers, fillColors: palette } },
      },
    }));
  }, [preferences.dashboardChartTypes.groups, preferences.dashboardColors, groupDistribution]);

  const handlePageChange = (page) => {
    fetchContactsData(page);
  };

  const handlePageSizeChange = (pageSize) => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize }));
    fetchContactsData(1, pageSize);
  };

  const handleDashboardRefresh = () => {
    fetchContactsData(pagination.current, pagination.pageSize);
    fetchChartData();
    fetchGroupsData();
  };

  const exportChartPng = async (chartId, fileName) => {
    try {
      const chartImage = await ApexCharts.exec(chartId, 'dataURI');
      if (!chartImage?.imgURI) throw new Error('Chart image is not ready');
      const downloadLink = document.createElement('a');
      downloadLink.href = chartImage.imgURI;
      downloadLink.download = `${fileName}.png`;
      downloadLink.click();
    } catch (error) {
      console.error('Error exporting dashboard chart:', error);
      toast.error('Could not export chart as PNG');
    }
  };

  const exportChartExcel = (fileName, worksheetName, rows) => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      toast.error('Could not export chart data as Excel');
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchContactsData();
  }, [fetchContactsData]);

  // Remove the contacts dependency for chart data
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]); // Only fetch chart data once on component mount

  // Fetch groups data
  useEffect(() => {
    fetchGroupsData();
  }, [fetchGroupsData]);

  // Update the tag filtering effect to include pagination
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      current: 1 // Reset to first page when filters change
    }));
    fetchContactsData(1);
  }, [selectedTags, fetchContactsData]);

  return (
    <div className={styles.dashboard}>
      {(loading.contacts && loading.charts && loading.groupsChart) ? (
        <div className={styles.loading}>
          <FontAwesomeIcon icon={faTachometerAlt} spin style={{ color: 'var(--text-secondary)' }} />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Loading dashboard...</p>
        </div>
      ) : (
        <>
      <div className={styles.chartsContainer}>
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Title level={4} className={styles.chartTitle}>Contacts by Tags</Title>
            <div className={styles.chartActions}>
              <button type="button" onClick={() => exportChartPng('dashboard-tags-chart', 'contacts-by-tags')} disabled={loading.charts} title="Download chart as PNG" aria-label="Download contacts by tags chart as PNG">
                <FontAwesomeIcon icon={faImage} />
              </button>
              <button type="button" onClick={() => exportChartExcel('contacts-by-tags', 'Tags', [['Tag', 'Contacts'], ...tagDistribution.labels.map((label, index) => [label, tagDistribution.counts[index]])])} title="Download chart data as Excel" aria-label="Download contacts by tags data as Excel">
                <FontAwesomeIcon icon={faFileExcel} />
              </button>
            </div>
          </div>
          {loading.charts ? (
            <div className={styles.chartLoader}>
              <Spin size="large" />
            </div>
          ) : (
            <ReactApexChart 
              options={pieOptions.options}
              series={pieOptions.series}
              type={preferences.dashboardChartTypes.tags}
              height={350}
            />
          )}
        </Card>
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Title level={4} className={styles.chartTitle}>Favorite vs Regular Contacts</Title>
            <div className={styles.chartActions}>
              <button type="button" onClick={() => exportChartPng('dashboard-favorites-chart', 'favorite-vs-regular')} disabled={loading.charts} title="Download chart as PNG" aria-label="Download favorites chart as PNG">
                <FontAwesomeIcon icon={faImage} />
              </button>
              <button type="button" onClick={() => exportChartExcel('favorite-vs-regular', 'Favorites', [['Contact type', 'Contacts'], ['Favorites', favoritesData.favorite], ['Regular', favoritesData.regular]])} title="Download chart data as Excel" aria-label="Download favorites data as Excel">
                <FontAwesomeIcon icon={faFileExcel} />
              </button>
            </div>
          </div>
          {loading.charts ? (
            <div className={styles.chartLoader}>
              <Spin size="large" />
            </div>
          ) : (
            <ReactApexChart 
              options={barOptions.options}
              series={barOptions.series}
              type={preferences.dashboardChartTypes.favorites}
              height={350}
            />
          )}
        </Card>
      </div>
      
      {/* Groups & Tags Statistics Chart - Separate Row */}
      <div className={styles.wideChart}>
        <Card className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <Title level={4} className={styles.chartTitle}>Groups vs Tags Contact Distribution</Title>
            <div className={styles.chartActions}>
              <button type="button" onClick={() => exportChartPng('dashboard-groups-chart', 'groups-vs-tags')} disabled={loading.groupsChart} title="Download chart as PNG" aria-label="Download groups and tags chart as PNG">
                <FontAwesomeIcon icon={faImage} />
              </button>
              <button type="button" onClick={() => exportChartExcel('groups-vs-tags', 'Groups and tags', [['Name', 'Group contacts', 'Tag contacts'], ...groupDistribution.labels.map((label, index) => [label, groupDistribution.groupContactsData[index], groupDistribution.tagContactsData[index]])])} title="Download chart data as Excel" aria-label="Download groups and tags data as Excel">
                <FontAwesomeIcon icon={faFileExcel} />
              </button>
            </div>
          </div>
          {loading.groupsChart ? (
            <div className={styles.chartLoader}>
              <Spin size="large" />
            </div>
          ) : (
            <ReactApexChart 
              options={groupsOptions.options}
              series={groupsOptions.series}
              type={preferences.dashboardChartTypes.groups === 'mixed' ? 'line' : preferences.dashboardChartTypes.groups}
              height={400}
            />
          )}
        </Card>
      </div>
      
      <Card className={styles.contactsList}>
        <Space className={styles.filterContainer}>
          <Title level={4} className={styles.contactsTitle}>
            Contacts List
          </Title>
          <Select
            mode="multiple"
            placeholder="Filter by tags"
            value={selectedTags}
            onChange={setSelectedTags}
            options={tags.map(tag => ({ 
              label: tag.name, 
              value: tag.name,
              key: tag.uid // Add key for better performance
            }))}
            style={{ minWidth: 200 }}
            className={styles.tagFilter}
            classNames={{ popup: { root: styles.tagFilterDropdown } }}
            allowClear
            loading={loading.contacts}
          />
        </Space>

        <List
          loading={loading.contacts}
          grid={{ 
            gutter: 16,
            xs: 1,
            sm: 1,
            md: 2,
            lg: 2,
            xl: 3,
            xxl: 3,
          }}
          dataSource={contacts}
          pagination={false}
          renderItem={contact => (
            <List.Item key={contact.uid} className={styles.contactListItem}>
              <Card 
                className={styles.contactCard}
              >
                <div className={styles.favoriteIndicator}>
                  {contact.is_favorite ? 
                    <StarFilled className={styles.starFilled} /> : 
                    <StarOutlined className={styles.starOutlined} />
                  }
                </div>
                <Card.Meta
                  title={
                    <div className={styles.contactTitle}>
                      {contact.firstName}
                      {contact.lastName && ` ${contact.lastName}`}
                    </div>
                  }
                  description={
                    <div className={styles.contactCardContent}>
                      <div className={styles.contactDetails}>
                        {contact.phone && (
                          <div className={styles.contactField}>
                            📞 {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className={styles.contactField}>
                            ✉️ {contact.email}
                          </div>
                        )}
                      </div>
                      <div className={styles.tagContainer}>
                        {contact.tags?.map(tag => (
                          <Tag 
                            key={tag.uid} 
                            color="processing"           // Ant Design's blue processing color
                            className={styles.contactTag}
                          >
                            {tag.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
        <PaginationBar
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          disabled={loading.contacts}
          onRefresh={handleDashboardRefresh}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </Card>
        </>
      )}
    </div>
  );
}

export default Dashboard;
