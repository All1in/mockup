import { useState, useEffect, memo } from 'react';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import Chip from "@mui/material/Chip";
import {TablePagination} from "@mui/material";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import { useDashboardActivity } from "@/hooks/useDashboardActivity";
import * as React from "react";
import type {DashboardActivityStatus} from "@/types/dashboardTypes";
import TextField from "@mui/material/TextField";
import { useDebounce } from '@/hooks/useDebounce';



function statusToChipProps(status: DashboardActivityStatus): {
    label: string;
    color: 'success' | 'error' | 'default';
} {
    switch (status) {
        case 'ok':
            return { label: 'Completed', color: 'success' };
        case 'warn':
            return { label: 'In progress', color: 'default' };
        case 'error':
            return { label: 'Needs attention', color: 'error' };
    }
}

const RecentActivities = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearchInput = useDebounce(searchInput, 300);

    const {
        data: activityResp,
        isLoading: activityLoading,
        isFetching: activityFetching,
        isError: activityError,
        error: activityErr,
    } = useDashboardActivity({ page, rowsPerPage, q: debouncedSearchInput });

    const activityErrorMsg =
        (activityErr instanceof Error && activityErr.message) ? activityErr.message : 'Failed to load activity';

    const activityItems = activityResp?.items ?? [];
    const total = activityResp?.total ?? 0;


    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRowsPerPage(Number(event.target.value));
        setPage(0);
    };

    useEffect(() => {
        setPage(0);
    }, [debouncedSearchInput]);

    return (
        <Card>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Recent activity
                    </Typography>

                    <TextField 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        id="standard-basic" 
                        label="Find any activity" 
                        variant="standard" 
                    />
                </Box>

                <Box sx={{ minHeight: 4 }}>
                    {(activityFetching || activityLoading) ? <LinearProgress /> : null}
                </Box>

                <TableContainer sx={{ maxHeight: 420, minHeight: 420, overflowY: 'auto' }}>
                    <Table size="small" stickyHeader aria-label="recent activity">
                        <TableHead>
                            <TableRow>
                                <TableCell>Event</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">When</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {activityLoading ? (
                                Array.from({ length: 8 }).map((_, idx) => (
                                    <TableRow key={`activity-skeleton-${idx}`}>
                                        <TableCell>
                                            <Skeleton variant="text" width="70%" />
                                            <Skeleton variant="text" width="45%" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="rounded" width={110} height={28} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Skeleton variant="text" width={80} sx={{ ml: 'auto' }} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : activityError ? (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="body2" color="error">
                                                {activityErrorMsg}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : activityItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3}>
                                        <Box sx={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="body2" color="text.secondary">
                                                No activity yet.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activityItems.map((row) => {
                                    const chip = statusToChipProps(row.status);

                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                        {row.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {row.detail}
                                                    </Typography>
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Chip label={chip.label} color={chip.color} />
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.whenLabel}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 20, 50]}
                />
            </Box>
        </Card>
    );
};

export default memo(RecentActivities);